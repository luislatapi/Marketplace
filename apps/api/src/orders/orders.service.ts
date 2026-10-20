import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { config } from '../config';
import { FulfillmentService } from '../fulfillment/fulfillment.service';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(FulfillmentService) private readonly fulfillment: FulfillmentService) {}

  /**
   * Confirma el pago (llamado solo desde el webhook o en modo demo). Idempotente:
   * si el pedido ya no está pendiente, no hace nada.
   */
  async markPaid(orderId: string, payment: { chargeId: string | null; paymentIntentId: string | null }) {
    const applied = await this.db.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: orderId, status: 'pending_payment' },
        data: { status: 'paid', paidAt: new Date(), chargeId: payment.chargeId ?? undefined },
      });
      if (claimed.count === 0) return false;

      const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { sellerOrders: { include: { items: true } } } });
      await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: 'paid' } });

      // La reserva se vuelve venta: baja el stock real y libera lo reservado.
      for (const item of order.sellerOrders.flatMap((so) => so.items).filter((i) => i.fulfillmentType === 'physical')) {
        await tx.$executeRaw`
          UPDATE physical_specs
          SET stock_on_hand = stock_on_hand - ${item.quantity}, stock_reserved = GREATEST(stock_reserved - ${item.quantity}, 0)
          WHERE variant_id = ${item.variantId}::uuid`;
      }

      // Libro mayor: el cobro total y la comisión de cada sub-pedido.
      await tx.transaction.create({
        data: { orderId, type: 'charge', amountCents: order.totalCents, currency: order.currency, stripeObjectId: payment.chargeId, status: 'succeeded' },
      });
      await tx.transaction.createMany({
        data: order.sellerOrders.map((so) => ({
          orderId,
          sellerOrderId: so.id,
          type: 'platform_fee',
          amountCents: so.commissionCents,
          currency: order.currency,
          status: 'succeeded',
        })),
      });
      return true;
    });

    if (applied) {
      this.log.log(`Pedido ${orderId} pagado; iniciando entrega`);
      await this.fulfillment.fulfill(orderId);
    }
    return applied;
  }

  /** Cancela un pedido pendiente y libera su stock reservado. */
  async cancelPending(orderId: string, reason: string) {
    return this.db.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({ where: { id: orderId, status: 'pending_payment' }, data: { status: 'cancelled' } });
      if (claimed.count === 0) return false;
      await this.releaseReservations(tx, orderId);
      await tx.sellerOrder.updateMany({ where: { orderId }, data: { status: 'cancelled' } });
      this.log.log(`Pedido ${orderId} cancelado: ${reason}`);
      return true;
    });
  }

  private async releaseReservations(tx: Tx, orderId: string) {
    const items = await tx.orderItem.findMany({ where: { sellerOrder: { orderId }, fulfillmentType: 'physical' } });
    for (const item of items) {
      await tx.$executeRaw`
        UPDATE physical_specs SET stock_reserved = GREATEST(stock_reserved - ${item.quantity}, 0)
        WHERE variant_id = ${item.variantId}::uuid`;
    }
  }

  /** Libera reservas de pedidos que nunca se pagaron. Se llama antes de cada checkout y desde el cron. */
  async expireStaleReservations() {
    const cutoff = new Date(Date.now() - config.reservationMinutes * 60_000);
    const stale = await this.db.order.findMany({ where: { status: 'pending_payment', createdAt: { lt: cutoff } }, select: { id: true }, take: 50 });
    for (const o of stale) await this.cancelPending(o.id, 'reserva vencida');
    return stale.length;
  }

  // ───────────── Comprador ─────────────

  listForBuyer(buyerId: string) {
    return this.db.order.findMany({
      where: { buyerId, status: { not: 'pending_payment' } },
      orderBy: { createdAt: 'desc' },
      include: {
        sellerOrders: {
          include: {
            seller: { select: { storeName: true, slug: true } },
            items: { select: { id: true, titleSnapshot: true, fulfillmentType: true, quantity: true, unitPriceCents: true, status: true } },
            shipments: { select: { carrier: true, trackingNumber: true, status: true, shippedAt: true, deliveredAt: true } },
          },
        },
      },
    });
  }

  async getForBuyer(buyerId: string, orderId: string) {
    const order = await this.db.order.findFirst({
      where: { id: orderId, buyerId },
      include: {
        sellerOrders: {
          include: {
            seller: { select: { storeName: true, slug: true } },
            items: { include: { entitlement: { select: { id: true, status: true } } } },
            shipments: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }
}
