import { BadRequestException, Controller, Headers, HttpCode, Post, Req, type RawBodyRequest, Inject } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentEventsService } from './payment-events.service';
import { StripeService } from './stripe.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(StripeService) private readonly stripe: StripeService, @Inject(PaymentEventsService) private readonly events: PaymentEventsService) {}

  /** Única fuente de verdad del pago: nunca se confía en la confirmación del navegador. */
  @Post('stripe')
  @HttpCode(200)
  async stripeWebhook(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature?: string) {
    if (!req.rawBody || !signature) throw new BadRequestException('Falta la firma');
    let event;
    try {
      event = this.stripe.constructEvent(req.rawBody, signature);
    } catch {
      throw new BadRequestException('Firma inválida');
    }
    const result = await this.events.handle(event);
    return { received: true, result };
  }
}
