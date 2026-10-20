import { BadRequestException, Body, Controller, Headers, HttpCode, Post, UseGuards, Inject } from '@nestjs/common';
import { checkoutInputSchema, type CheckoutInput } from '@mkt/shared';
import { AuthGuard, CurrentUser, type AuthUser } from '../auth/auth.guard';
import { ZodPipe } from '../common/zod.pipe';
import { CheckoutService } from './checkout.service';

const quoteSchema = checkoutInputSchema.pick({ items: true, shipping: true, address: true });

@Controller('checkout')
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkout: CheckoutService) {}

  /** Público: la web lo usa para mostrar totales y opciones de envío antes de pedir datos. */
  @Post('quote')
  @HttpCode(200)
  quote(@Body(new ZodPipe(quoteSchema)) body: Pick<CheckoutInput, 'items' | 'shipping' | 'address'>) {
    return this.checkout.quote(body);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(checkoutInputSchema)) body: CheckoutInput,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 100) {
      throw new BadRequestException('Falta el encabezado Idempotency-Key (16–100 caracteres)');
    }
    return this.checkout.create(user.sub, body, `${user.sub}:${idempotencyKey}`);
  }
}
