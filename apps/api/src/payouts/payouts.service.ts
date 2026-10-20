import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { config } from '../config';
import { StripeService } from '../payments/stripe.service';

const DAY = 86_400_000;

export interface PayoutCandidate {
  paidAt: Date | null;
  items: { fulfillmentType: 'physical' | 'digital'; status: string }[];
  shipments: { deliveredAt: Date | null }[];
  openDisputes: number;
}

/**
 * ¿Ya se puede transferir el 85 % de este sub-pedido?
 * - Digital: pasada la ventana de reembolso desde el pago.
 * - Físico: todo entregado y pasada la ventana de devolución desde la entrega.
 * - Nunca con disputas abiertas.
 */
export function payoutReady(c: PayoutCandidate, hold: { digital: number; physical: number }, now = new Date()) {
  if (!c.paidAt || c.openDisputes > 0) return false;
  const physical = c.items.filter((i) => i.fulfillmentType === 'physical');
  const digital = c.items.filter((i) => i.fulfillmentType === 'digital');

  if (digital.length && now.getTime() - c.paidAt.getTime() < hold.digital * DAY) return false;
  if (physical.length) {
    if (physical.some((i) => i.status !== 'delivered')) return false;
    const delivered = c.shipments.map((s) => s.deliveredAt?.getTime() ?? 0);
    if (!delivered.length || delivered.some((t) => t === 0)) return false;
    if (now.getTime() - Math.max(...delivered) < hold.physical * DAY) return false;
  }
  return true;
}

@Injectable()
export class PayoutsService {
  private readonly log = new Logger(PayoutsService.name);

  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(StripeService) private readonly stripe: StripeService) {}

  /** Transfiere a cada vendedor su neto (productos − 15 % + envío). Pensado para un cron diario. */
  async releaseDue(now = new Date()) {
    const rows = await this.db.sellerOrder.findMany({
      where: { transferId: null, status: { notIn: ['awaiting_payment', 'cancelled', 'refunded'] }, order: { status: { in: ['paid', 'partially_fulfilled', 'fulfilled'] } } },
      include: {
        seller: { select: { stripeAccountId: true, payoutsEnabled: true, storeName: true } },
        order: { select: { id: true, paidAt: true, chargeId: true, currency: true, transferGroup: true, paymentMode: true } },
        items: { select: { fulfillmentType: true, status: true, _count: { select: { disputes: { where: { status: { notIn: ['resolved_refund', 'resolved_rejected'] } } } } } } },
        shipments: { select: { deliveredAt: true } },
      },
      take: 200,
    });

    const result = { checked: rows.length, transferred: 0, skipped: [] as string[] };
    for (const so of rows) {
      const ready = payoutReady(
        { paidAt: so.order.paidAt, items: so.items, shipments: so.shipments, openDisputes: so.items.reduce((s, i) => s + i._count.disputes, 0) },
        config.payoutHoldDays,
        now,
      );
      if (!ready) continue;
      if (so.order.paymentMode === 'demo' || !so.order.chargeId) {
        result.skipped.push(`${so.id}: pedido de demostración`);
        continue;
      }
      if (!so.seller.stripeAccountId || !so.seller.payoutsEnabled) {
        result.skipped.push(`${so.id}: ${so.seller.storeName} no ha terminado su alta en Stripe`);
        continue;
      }
      try {
        const tr = await this.stripe.transferToSeller({
          accountId: so.seller.stripeAccountId,
          amountCents: Number(so.sellerNetCents),
          currency: so.order.currency,
          transferGroup: so.order.transferGroup ?? `ORDER_${so.order.id}`,
          sourceChargeId: so.order.chargeId,
          idempotencyKey: `transfer_${so.id}`,
          sellerOrderId: so.id,
        });
        await this.db.$transaction([
          this.db.sellerOrder.update({ where: { id: so.id }, data: { transferId: tr.id, transferredAt: new Date() } }),
          this.db.transaction.create({
            data: { orderId: so.order.id, sellerOrderId: so.id, type: 'seller_transfer', amountCents: so.sellerNetCents, currency: so.order.currency, stripeObjectId: tr.id, status: 'succeeded' },
          }),
        ]);
        result.transferred++;
      } catch (e) {
        this.log.error(`Transferencia fallida para ${so.id}: ${(e as Error).message}`);
        result.skipped.push(`${so.id}: ${(e as Error).message}`);
      }
    }
    return result;
  }
}
