import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { PrismaService } from '../common/prisma.service';

/**
 * Procesa eventos de Stripe de forma idempotente: cada event.id se registra una sola vez
 * en webhook_events dentro de la misma transacción que aplica sus efectos.
 */
@Injectable()
export class PaymentEventsService {
  private readonly log = new Logger(PaymentEventsService.name);

  constructor(private readonly db: PrismaService) {}

  async handle(event: Stripe.Event): Promise<'processed' | 'duplicate' | 'ignored'> {
    const seen = await this.db.webhookEvent.findUnique({ where: { stripeEventId: event.id } });
    if (seen?.processedAt) return 'duplicate';

    let handled = true;
    await this.db.$transaction(async (tx) => {
      switch (event.type) {
        case 'account.updated': {
          const account = event.data.object as Stripe.Account;
          await tx.seller.updateMany({
            where: { stripeAccountId: account.id },
            data: {
              payoutsEnabled: Boolean(account.payouts_enabled),
              status: account.charges_enabled || account.payouts_enabled ? 'active' : 'pending_kyc',
            },
          });
          break;
        }

        case 'payment_intent.succeeded': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const order = await tx.order.findUnique({ where: { paymentIntentId: pi.id }, include: { sellerOrders: true } });
          if (!order) {
            this.log.warn(`PaymentIntent ${pi.id} sin pedido asociado`);
            break;
          }
          if (order.status !== 'pending_payment') break; // ya aplicado

          await tx.order.update({ where: { id: order.id }, data: { status: 'paid', paidAt: new Date() } });
          await tx.sellerOrder.updateMany({ where: { orderId: order.id }, data: { status: 'paid' } });

          // Libro mayor: el cobro total y la comisión de cada sub-pedido.
          const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id;
          await tx.transaction.create({
            data: { orderId: order.id, type: 'charge', amountCents: order.totalCents, currency: order.currency, stripeObjectId: chargeId, status: 'succeeded' },
          });
          for (const so of order.sellerOrders) {
            await tx.transaction.create({
              data: { orderId: order.id, sellerOrderId: so.id, type: 'platform_fee', amountCents: so.commissionCents, currency: order.currency, status: 'succeeded' },
            });
          }
          // Fase 1: aquí se publica OrderPaid → Cumplimiento crea entitlements (digital) y shipments (físico).
          break;
        }

        default:
          handled = false;
      }

      await tx.webhookEvent.upsert({
        where: { stripeEventId: event.id },
        create: { stripeEventId: event.id, type: event.type, processedAt: new Date() },
        update: { processedAt: new Date() },
      });
    });

    return handled ? 'processed' : 'ignored';
  }
}
