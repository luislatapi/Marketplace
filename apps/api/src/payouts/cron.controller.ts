import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import { config } from '../config';
import { OrdersService } from '../orders/orders.service';
import { PayoutsService } from './payouts.service';

/** Tareas programadas. Vercel Cron llama con `Authorization: Bearer $CRON_SECRET`. */
@Controller('cron')
export class CronController {
  constructor(private readonly payouts: PayoutsService, private readonly orders: OrdersService) {}

  private check(auth?: string) {
    const expected = config.cronSecret ? `Bearer ${config.cronSecret}` : null;
    const ok = expected && auth && auth.length === expected.length && timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
    if (!ok) throw new UnauthorizedException();
  }

  @Get('daily')
  async daily(@Headers('authorization') auth?: string) {
    this.check(auth);
    const expired = await this.orders.expireStaleReservations();
    const payouts = await this.payouts.releaseDue();
    return { expiredReservations: expired, payouts };
  }
}
