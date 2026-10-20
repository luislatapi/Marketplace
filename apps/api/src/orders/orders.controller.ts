import { Body, Controller, Get, Ip, Headers, HttpCode, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { LibraryService } from '../library/library.service';
import { OrdersService } from './orders.service';
import { SellerOrdersService } from './seller-orders.service';

@Controller()
@UseGuards(AuthGuard)
export class BuyerController {
  constructor(private readonly orders: OrdersService, private readonly library: LibraryService) {}

  @Get('orders')
  list(@CurrentUser() user: AuthUser) {
    return this.orders.listForBuyer(user.sub);
  }

  @Get('orders/:id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.getForBuyer(user.sub, id);
  }

  @Get('library')
  myLibrary(@CurrentUser() user: AuthUser) {
    return this.library.list(user.sub);
  }

  @Post('library/:id/download')
  @HttpCode(200)
  download(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Ip() ip: string, @Headers('user-agent') ua?: string) {
    return this.library.download(user.sub, id, { ip, userAgent: ua });
  }
}

const shipSchema = z.object({
  carrier: z.string().min(2).max(60),
  trackingNumber: z.string().min(4).max(60),
  serviceLevel: z.string().max(60).optional(),
});

@Controller('seller')
@UseGuards(AuthGuard)
@Roles('seller')
export class SellerOrdersController {
  constructor(private readonly sellerOrders: SellerOrdersService) {}

  @Get('orders')
  list(@CurrentUser() user: AuthUser) {
    return this.sellerOrders.list(user);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUser) {
    return this.sellerOrders.stats(user);
  }

  @Patch('shipments/:id/ship')
  ship(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body(new ZodPipe(shipSchema)) body: z.infer<typeof shipSchema>) {
    return this.sellerOrders.markShipped(user, id, body);
  }

  @Patch('shipments/:id/delivered')
  delivered(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.sellerOrders.markDelivered(user, id);
  }
}
