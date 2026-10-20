import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.guard';
import { CurrentSeller } from '../common/current-seller';
import { PrismaService } from '../common/prisma.service';
import { FulfillmentService } from '../fulfillment/fulfillment.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SellerOrdersService {
  constructor(
    private readonly db: PrismaService,
    private readonly current: CurrentSeller,
    private readonly fulfillment: FulfillmentService,
    private readonly notify: NotificationsService,
  ) {}

  async list(user: AuthUser) {
    const sellerId = await this.current.id(user);
    return this.db.sellerOrder.findMany({
      where: { sellerId, status: { notIn: ['awaiting_payment', 'cancelled'] } },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        order: { select: { number: true, createdAt: true, shippingAddress: true, status: true } },
        items: { select: { id: true, titleSnapshot: true, fulfillmentType: true, quantity: true, lineTotalCents: true, status: true } },
        shipments: true,
      },
    });
  }

  /** Últimos 30 días: ventas de productos, comisión 15 %, envíos (100 % del vendedor) y neto. */
  async stats(user: AuthUser) {
    const seller = await this.current.get(user);
    const since = new Date(Date.now() - 30 * 86_400_000);
    const agg = await this.db.sellerOrder.aggregate({
      where: { sellerId: seller.id, order: { paidAt: { gte: since } }, status: { not: 'cancelled' } },
      _sum: { itemsCents: true, shippingCents: true, commissionCents: true, sellerNetCents: true },
      _count: true,
    });
    const pending = await this.db.sellerOrder.aggregate({
      where: { sellerId: seller.id, transferId: null, order: { status: { in: ['paid', 'partially_fulfilled', 'fulfilled'] } } },
      _sum: { sellerNetCents: true },
    });
    return {
      periodDays: 30,
      orders: agg._count,
      itemsCents: Number(agg._sum.itemsCents ?? 0),
      shippingCents: Number(agg._sum.shippingCents ?? 0),
      commissionCents: Number(agg._sum.commissionCents ?? 0),
      netCents: Number(agg._sum.sellerNetCents ?? 0),
      pendingPayoutCents: Number(pending._sum.sellerNetCents ?? 0),
      commissionPercent: seller.commissionBps / 100,
      payoutsEnabled: seller.payoutsEnabled,
    };
  }

  private async ownShipment(user: AuthUser, shipmentId: string) {
    const sellerId = await this.current.id(user);
    const shipment = await this.db.shipment.findFirst({
      where: { id: shipmentId, sellerOrder: { sellerId } },
      include: { sellerOrder: { include: { order: { select: { id: true, number: true, billingEmail: true } } } } },
    });
    if (!shipment) throw new NotFoundException('Envío no encontrado');
    return shipment;
  }

  async markShipped(user: AuthUser, shipmentId: string, data: { carrier: string; trackingNumber: string; serviceLevel?: string }) {
    const s = await this.ownShipment(user, shipmentId);
    if (!['label_pending', 'pickup_scheduled'].includes(s.status)) throw new BadRequestException(`El envío ya está ${s.status}`);
    await this.db.$transaction([
      this.db.shipment.update({ where: { id: s.id }, data: { ...data, status: 'in_transit', shippedAt: new Date() } }),
      this.db.orderItem.updateMany({ where: { sellerOrderId: s.sellerOrderId, fulfillmentType: 'physical' }, data: { status: 'shipped' } }),
    ]);
    await this.fulfillment.recomputeStatus(s.sellerOrder.order.id);
    await this.notify.buyerShipped(s.sellerOrder.order.billingEmail, s.sellerOrder.order.number, data.carrier, data.trackingNumber);
    return { ok: true };
  }

  /** Mientras no hay webhook de la paquetería, el vendedor confirma la entrega manualmente. */
  async markDelivered(user: AuthUser, shipmentId: string) {
    const s = await this.ownShipment(user, shipmentId);
    if (s.status !== 'in_transit') throw new BadRequestException('Primero marca el envío como enviado');
    await this.db.$transaction([
      this.db.shipment.update({ where: { id: s.id }, data: { status: 'delivered', deliveredAt: new Date() } }),
      this.db.orderItem.updateMany({ where: { sellerOrderId: s.sellerOrderId, fulfillmentType: 'physical' }, data: { status: 'delivered' } }),
    ]);
    await this.fulfillment.recomputeStatus(s.sellerOrder.order.id);
    return { ok: true };
  }
}
