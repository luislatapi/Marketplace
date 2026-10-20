import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { PrismaService } from '../common/prisma.service';

/** Tablero financiero de la plataforma (últimos 30 días). */
@Controller('admin')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get('summary')
  async summary() {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const paid = { status: { in: ['paid', 'partially_fulfilled', 'fulfilled'] }, paidAt: { gte: since } };
    const [orders, fees, transfers, byType, pendingReview, sellers] = await Promise.all([
      this.db.order.aggregate({ where: paid, _sum: { totalCents: true, subtotalCents: true, shippingCents: true }, _count: true }),
      this.db.transaction.aggregate({ where: { type: 'platform_fee', createdAt: { gte: since } }, _sum: { amountCents: true } }),
      this.db.transaction.aggregate({ where: { type: 'seller_transfer', createdAt: { gte: since } }, _sum: { amountCents: true } }),
      this.db.orderItem.groupBy({ by: ['fulfillmentType'], where: { sellerOrder: { order: paid } }, _sum: { lineTotalCents: true }, _count: true }),
      this.db.product.count({ where: { status: 'in_review' } }),
      this.db.seller.groupBy({ by: ['status'], _count: true }),
    ]);
    return {
      periodDays: 30,
      orders: orders._count,
      gmvCents: Number(orders._sum.totalCents ?? 0),
      productSalesCents: Number(orders._sum.subtotalCents ?? 0),
      shippingCents: Number(orders._sum.shippingCents ?? 0),
      commissionCents: Number(fees._sum.amountCents ?? 0),
      transferredToSellersCents: Number(transfers._sum.amountCents ?? 0),
      salesByType: byType.map((t) => ({ type: t.fulfillmentType, lines: t._count, cents: Number(t._sum.lineTotalCents ?? 0) })),
      productsAwaitingReview: pendingReview,
      sellersByStatus: sellers.map((s) => ({ status: s.status, count: s._count })),
    };
  }
}
