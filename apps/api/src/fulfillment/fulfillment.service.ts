import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export function licenseKey() {
  const raw = randomBytes(10).toString('hex').toUpperCase();
  return raw.match(/.{1,5}/g)!.join('-');
}

/** Estado del pedido a partir de sus líneas. */
export function orderStatusFromItems(statuses: string[]): 'paid' | 'partially_fulfilled' | 'fulfilled' {
  const done = statuses.filter((s) => s === 'delivered').length;
  if (done === statuses.length && statuses.length > 0) return 'fulfilled';
  if (done > 0 || statuses.some((s) => s === 'shipped')) return 'partially_fulfilled';
  return 'paid';
}

/**
 * Decide qué hacer con cada línea de un pedido pagado, según su tipo:
 * - digital → derecho de acceso (entitlement) inmediato en la biblioteca
 * - físico  → envío por vendedor, en espera de guía
 * Es idempotente: se puede volver a ejecutar sin duplicar nada.
 */
@Injectable()
export class FulfillmentService {
  private readonly log = new Logger(FulfillmentService.name);

  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(NotificationsService) private readonly notify: NotificationsService) {}

  async fulfill(orderId: string) {
    const order = await this.db.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        sellerOrders: {
          include: {
            seller: { select: { storeName: true, user: { select: { email: true } } } },
            items: { include: { variant: { include: { digital: true } }, entitlement: true } },
            shipments: true,
          },
        },
      },
    });
    if (!['paid', 'partially_fulfilled'].includes(order.status)) return;

    const grantedTitles: string[] = [];

    for (const so of order.sellerOrders) {
      // Digitales: entrega inmediata.
      for (const item of so.items.filter((i) => i.fulfillmentType === 'digital' && !i.entitlement)) {
        const spec = item.variant.digital;
        if (!spec) {
          this.log.error(`La línea ${item.id} es digital pero su variante no tiene archivo`);
          continue;
        }
        await this.db.$transaction([
          this.db.entitlement.create({
            data: {
              orderItemId: item.id,
              buyerId: order.buyerId,
              assetId: spec.assetId,
              maxDownloads: spec.maxDownloads,
              expiresAt: spec.accessDays ? new Date(Date.now() + spec.accessDays * 86_400_000) : null,
              licenseKey: spec.deliveryKind === 'license_key' ? licenseKey() : null,
            },
          }),
          this.db.orderItem.update({ where: { id: item.id }, data: { status: 'delivered' } }),
        ]);
        grantedTitles.push(item.titleSnapshot);
      }

      // Físicos: un envío por sub-pedido, en espera de que el vendedor genere la guía.
      const physical = so.items.filter((i) => i.fulfillmentType === 'physical');
      if (physical.length && so.shipments.length === 0) {
        await this.db.$transaction([
          this.db.shipment.create({ data: { sellerOrderId: so.id, status: 'label_pending' } }),
          this.db.orderItem.updateMany({ where: { id: { in: physical.map((i) => i.id) }, status: 'pending' }, data: { status: 'ready_to_ship' } }),
        ]);
        await this.notify.sellerNewShipment(so.seller.user.email, so.seller.storeName, order.number, physical.map((i) => `${i.quantity} × ${i.titleSnapshot}`));
      }
    }

    await this.recomputeStatus(orderId);
    if (grantedTitles.length) await this.notify.buyerDigitalReady(order.billingEmail, order.number, grantedTitles);
    await this.notify.buyerReceipt(order.billingEmail, order.number, Number(order.totalCents), order.currency);
  }

  async recomputeStatus(orderId: string) {
    const items = await this.db.orderItem.findMany({ where: { sellerOrder: { orderId } }, select: { status: true } });
    const status = orderStatusFromItems(items.map((i) => i.status));
    await this.db.order.updateMany({ where: { id: orderId, status: { in: ['paid', 'partially_fulfilled', 'fulfilled'] } }, data: { status } });
    return status;
  }
}
