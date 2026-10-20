import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { PrismaService } from '../common/prisma.service';
import { OrdersService } from '../orders/orders.service';

/**
 * Procesa eventos de Stripe. Cada event.id se registra una sola vez; si un efecto falla,
 * el evento queda sin `processedAt` y Stripe lo reintenta.
 */
@Injectable()
export class PaymentEventsService {
  private readonly log = new Logger(PaymentEventsService.name);

  constructor(private readonly db: PrismaService, private readonly orders: OrdersService) {}

  async handle(event: Stripe.Event): Promise<'processed' | 'duplicate' | 'ignored'> {
    const seen = await this.db.webhookEvent.findUnique({ where: { stripeEventId: event.id } });
    if (seen?.processedAt) return 'duplicate';
    if (!seen) await this.db.webhookEvent.create({ data: { stripeEventId: event.id, type: event.type } });

    let handled = true;
    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await this.db.seller.updateMany({
          where: { stripeAccountId: account.id },
          data: { payoutsEnabled: Boolean(account.payouts_enabled), status: account.payouts_enabled ? 'active' : 'pending_kyc' },
        });
        break;
      }
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const order = await this.findOrder(pi);
        if (!order) {
          this.log.warn(`PaymentIntent ${pi.id} sin pedido asociado`);
          break;
        }
        const chargeId = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge?.id ?? null);
        await this.orders.markPaid(order.id, { chargeId, paymentIntentId: pi.id });
        break;
      }
      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const order = await this.findOrder(pi);
        // Un pago fallido no cancela todavía: el comprador puede reintentar. Solo "canceled" libera.
        if (order && event.type === 'payment_intent.canceled') await this.orders.cancelPending(order.id, 'pago cancelado');
        break;
      }
      default:
        handled = false;
    }

    await this.db.webhookEvent.update({ where: { stripeEventId: event.id }, data: { processedAt: new Date() } });
    return handled ? 'processed' : 'ignored';
  }

  private findOrder(pi: Stripe.PaymentIntent) {
    const orderId = pi.metadata?.orderId;
    return this.db.order.findFirst({ where: orderId ? { id: orderId } : { paymentIntentId: pi.id }, select: { id: true } });
  }
}
