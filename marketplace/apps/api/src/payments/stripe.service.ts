import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { config } from '../config';

/**
 * Envoltura delgada sobre Stripe Connect.
 * Modelo: "separate charges and transfers" — un cobro en la plataforma por pedido y
 * una transferencia por vendedor (85 % de sus productos + su envío). El 15 % se queda.
 */
@Injectable()
export class StripeService {
  readonly client = new Stripe(config.stripe.secretKey);

  /** Cuenta Express para el vendedor; Stripe hace el KYC y guarda su cuenta bancaria. */
  createExpressAccount(email: string, country = 'MX') {
    return this.client.accounts.create({
      type: 'express',
      country,
      email,
      capabilities: { transfers: { requested: true } },
    });
  }

  /** Enlace de onboarding alojado por Stripe (datos fiscales, identidad, CLABE). */
  createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
    return this.client.accountLinks.create({
      account: accountId,
      type: 'account_onboarding',
      return_url: returnUrl,
      refresh_url: refreshUrl,
    });
  }

  /** Transfiere el neto de un sub-pedido. Se usa en la Fase 1 al liberar fondos. */
  transferToSeller(params: { accountId: string; amountCents: number; currency: string; transferGroup: string; sourceChargeId: string; idempotencyKey: string }) {
    return this.client.transfers.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        destination: params.accountId,
        transfer_group: params.transferGroup,
        source_transaction: params.sourceChargeId,
      },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  constructEvent(rawBody: Buffer, signature: string) {
    return this.client.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  }
}
