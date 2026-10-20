import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import type { CheckoutInput } from '@mkt/shared';
import { randomInt } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { config } from '../config';
import { OrdersService } from '../orders/orders.service';
import { StripeService } from '../payments/stripe.service';
import { buildOrderPlan, PlanError, type PlanVariant } from './order-plan';

@Injectable()
export class CheckoutService {
  private readonly log = new Logger(CheckoutService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly stripe: StripeService,
    private readonly orders: OrdersService,
  ) {}

  private async loadVariants(ids: string[]): Promise<PlanVariant[]> {
    const rows = await this.db.productVariant.findMany({
      where: { id: { in: ids } },
      include: {
        physical: true,
        product: { select: { id: true, title: true, status: true, sellerId: true, seller: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      sku: r.sku,
      name: r.name,
      fulfillmentType: r.fulfillmentType,
      priceCents: Number(r.priceCents),
      currency: r.currency,
      isActive: r.isActive,
      product: { id: r.product.id, title: r.product.title, status: r.product.status, sellerId: r.product.sellerId },
      seller: {
        id: r.product.seller.id,
        storeName: r.product.seller.storeName,
        status: r.product.seller.status,
        payoutsEnabled: r.product.seller.payoutsEnabled,
        commissionBps: r.product.seller.commissionBps,
      },
      physical: r.physical ? { available: r.physical.stockOnHand - r.physical.stockReserved, weightGrams: r.physical.weightGrams } : null,
    }));
  }

  /** Vista previa sin reservar nada: totales y opciones de envío por vendedor. */
  async quote(input: Pick<CheckoutInput, 'items' | 'shipping' | 'address'>) {
    try {
      const plan = buildOrderPlan(await this.loadVariants(input.items.map((i) => i.variantId)), input);
      return {
        currency: plan.currency,
        requiresShipping: plan.requiresShipping,
        subtotalCents: plan.subtotalCents,
        shippingCents: plan.shippingCents,
        totalCents: plan.totalCents,
        sellers: plan.sellers.map((s) => ({ sellerId: s.sellerId, storeName: s.storeName, itemsCents: s.itemsCents, shipping: s.shipping })),
      };
    } catch (e) {
      if (e instanceof PlanError) throw new BadRequestException(e.message);
      throw e;
    }
  }

  /**
   * Crea el pedido, reserva stock y abre el cobro.
   * El pedido NO se considera pagado hasta que llegue el webhook de Stripe.
   */
  async create(buyerId: string, input: CheckoutInput, idempotencyKey: string) {
    const existing = await this.db.order.findUnique({ where: { idempotencyKey } });
    if (existing) return this.response(existing.id);

    await this.orders.expireStaleReservations();

    let plan;
    try {
      plan = buildOrderPlan(await this.loadVariants(input.items.map((i) => i.variantId)), input);
    } catch (e) {
      if (e instanceof PlanError) throw new BadRequestException(e.message);
      throw e;
    }

    const number = `MKT-${new Date().getFullYear()}-${String(randomInt(100_000, 999_999))}`;

    const order = await this.db.$transaction(async (tx) => {
      // Reserva atómica: solo descuenta si todavía hay unidades libres.
      for (const s of plan.sellers) {
        for (const l of s.lines.filter((x) => x.variant.fulfillmentType === 'physical')) {
          const updated = await tx.$executeRaw`
            UPDATE physical_specs SET stock_reserved = stock_reserved + ${l.qty}
            WHERE variant_id = ${l.variant.id}::uuid AND stock_on_hand - stock_reserved >= ${l.qty}`;
          if (updated !== 1) throw new ConflictException(`«${l.title}» se acaba de agotar`);
        }
      }

      return tx.order.create({
        data: {
          number,
          buyerId,
          status: 'pending_payment',
          requiresShipping: plan.requiresShipping,
          shippingAddress: input.address ?? undefined,
          billingEmail: input.email,
          subtotalCents: BigInt(plan.subtotalCents),
          shippingCents: BigInt(plan.shippingCents),
          totalCents: BigInt(plan.totalCents),
          currency: plan.currency,
          idempotencyKey,
          paymentMode: config.demoPayments ? 'demo' : 'stripe',
          sellerOrders: {
            create: plan.sellers.map((s) => ({
              sellerId: s.sellerId,
              status: 'awaiting_payment',
              itemsCents: BigInt(s.itemsCents),
              shippingCents: BigInt(s.shippingCents),
              commissionBps: s.commissionBps,
              commissionCents: BigInt(s.commissionCents),
              sellerNetCents: BigInt(s.sellerNetCents),
              items: {
                create: s.lines.map((l) => ({
                  variantId: l.variant.id,
                  fulfillmentType: l.variant.fulfillmentType,
                  titleSnapshot: l.title,
                  unitPriceCents: BigInt(l.variant.priceCents),
                  quantity: l.qty,
                  lineTotalCents: BigInt(l.lineTotalCents),
                })),
              },
            })),
          },
        },
      });
    });

    await this.db.order.update({ where: { id: order.id }, data: { transferGroup: `ORDER_${order.id}` } });

    if (config.demoPayments) {
      this.log.warn(`Pedido ${order.number} pagado en modo DEMO (sin cobro real)`);
      await this.orders.markPaid(order.id, { chargeId: null, paymentIntentId: null });
      return this.response(order.id);
    }

    const pi = await this.stripe.createPaymentIntent({
      amountCents: plan.totalCents,
      currency: plan.currency,
      orderId: order.id,
      orderNumber: order.number,
      email: input.email,
      transferGroup: `ORDER_${order.id}`,
      idempotencyKey: `pi_${idempotencyKey}`,
    });
    await this.db.order.update({ where: { id: order.id }, data: { paymentIntentId: pi.id } });
    return { ...(await this.response(order.id)), clientSecret: pi.client_secret };
  }

  private async response(orderId: string) {
    const o = await this.db.order.findUniqueOrThrow({ where: { id: orderId } });
    return { orderId: o.id, number: o.number, status: o.status, totalCents: Number(o.totalCents), currency: o.currency, paymentMode: o.paymentMode };
  }
}
