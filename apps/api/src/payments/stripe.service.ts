import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { config } from '../config';

/**
 * Stripe Connect con "separate charges and transfers": un cobro por pedido en la cuenta
 * de la plataforma y una transferencia por vendedor (productos − 15 % + su envío).
 */
@Injectable()
export class StripeService {
  readonly client = new Stripe(config.stripe.secretKey);

  private ensureEnabled() {
    if (!config.stripe.enabled) throw new ServiceUnavailableException('Stripe no está configurado (falta STRIPE_SECRET_KEY)');
  }

  createExpressAccount(email: string, country = 'MX') {
    this.ensureEnabled();
    return this.client.accounts.create({ type: 'express', country, email, capabilities: { transfers: { requested: true } } });
  }

  createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
    this.ensureEnabled();
    return this.client.accountLinks.create({ account: accountId, type: 'account_onboarding', return_url: returnUrl, refresh_url: refreshUrl });
  }

  createPaymentIntent(p: { amountCents: number; currency: string; orderId: string; orderNumber: string; email: string; transferGroup: string; idempotencyKey: string }) {
    this.ensureEnabled();
    return this.client.paymentIntents.create(
      {
        amount: p.amountCents,
        currency: p.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: p.email,
        transfer_group: p.transferGroup,
        description: `Pedido ${p.orderNumber}`,
        metadata: { orderId: p.orderId, orderNumber: p.orderNumber },
      },
      { idempotencyKey: p.idempotencyKey },
    );
  }

  cancelPaymentIntent(id: string) {
    this.ensureEnabled();
    return this.client.paymentIntents.cancel(id);
  }

  transferToSeller(p: { accountId: string; amountCents: number; currency: string; transferGroup: string; sourceChargeId: string; idempotencyKey: string; sellerOrderId: string }) {
    this.ensureEnabled();
    return this.client.transfers.create(
      {
        amount: p.amountCents,
        currency: p.currency.toLowerCase(),
        destination: p.accountId,
        transfer_group: p.transferGroup,
        source_transaction: p.sourceChargeId,
        metadata: { sellerOrderId: p.sellerOrderId },
      },
      { idempotencyKey: p.idempotencyKey },
    );
  }

  constructEvent(rawBody: Buffer, signature: string) {
    return this.client.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }
}
