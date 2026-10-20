import Stripe from 'stripe';
import { beforeAll, describe, expect, it } from 'vitest';

const PLATFORM = 'whsec_test_platform_secret_123';
const CONNECT = 'whsec_test_connect_secret_456';

describe('StripeService.constructEvent', () => {
  let service: { constructEvent(raw: Buffer, sig: string): Stripe.Event };

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    process.env.STRIPE_WEBHOOK_SECRET = PLATFORM;
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = CONNECT;
    const { StripeService } = await import('./stripe.service');
    service = new StripeService();
  });

  const payload = JSON.stringify({ id: 'evt_test_1', object: 'event', type: 'account.updated', data: { object: {} } });
  const sign = (secret: string) => Stripe.webhooks.generateTestHeaderString({ payload, secret });

  it('acepta eventos de la plataforma', () => {
    expect(service.constructEvent(Buffer.from(payload), sign(PLATFORM)).id).toBe('evt_test_1');
  });

  it('acepta eventos de cuentas conectadas', () => {
    expect(service.constructEvent(Buffer.from(payload), sign(CONNECT)).id).toBe('evt_test_1');
  });

  it('rechaza firmas con otro secreto', () => {
    expect(() => service.constructEvent(Buffer.from(payload), sign('whsec_otro'))).toThrow();
  });

  it('rechaza un cuerpo alterado', () => {
    const sig = sign(PLATFORM);
    expect(() => service.constructEvent(Buffer.from(payload.replace('evt_test_1', 'evt_falso')), sig)).toThrow();
  });
});
