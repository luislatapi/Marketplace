import { z } from 'zod';

const env = z
  .object({
    PORT: z.coerce.number().optional(),
    API_PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(16).default('dev-only-secret-cambialo'),
    PLATFORM_COMMISSION_BPS: z.coerce.number().int().default(1500),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    /** Secreto del webhook de cuentas conectadas (vendedores), p. ej. account.updated. */
    STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
    /** Sin Stripe configurado, los pedidos se marcan pagados al instante (solo pruebas). */
    DEMO_PAYMENTS: z.enum(['true', 'false']).optional(),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    VAULT_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
    CRON_SECRET: z.string().optional(),
    /** Días que se retiene el 85 % antes de transferir (ventana de devoluciones). */
    PAYOUT_HOLD_DAYS_DIGITAL: z.coerce.number().int().min(0).default(7),
    PAYOUT_HOLD_DAYS_PHYSICAL: z.coerce.number().int().min(0).default(7),
    RESERVATION_MINUTES: z.coerce.number().int().min(5).default(30),
  })
  .parse(process.env);

const stripeEnabled = Boolean(env.STRIPE_SECRET_KEY?.startsWith('sk_'));

export const config = {
  port: env.PORT ?? env.API_PORT,
  webUrl: env.WEB_URL,
  jwtSecret: env.JWT_SECRET,
  commissionBps: env.PLATFORM_COMMISSION_BPS,
  stripe: {
    enabled: stripeEnabled,
    secretKey: env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder',
    webhookSecret: env.STRIPE_WEBHOOK_SECRET ?? 'whsec_placeholder',
    /** Todos los secretos válidos: plataforma y cuentas conectadas. */
    webhookSecrets: [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET].filter((s): s is string => Boolean(s?.startsWith('whsec_'))),
  },
  /** Pagos simulados: explícitos, o automáticos cuando no hay llave de Stripe. */
  demoPayments: env.DEMO_PAYMENTS ? env.DEMO_PAYMENTS === 'true' : !stripeEnabled,
  blob: {
    enabled: Boolean(env.BLOB_READ_WRITE_TOKEN),
    vaultTtlSeconds: env.VAULT_URL_TTL_SECONDS,
  },
  cronSecret: env.CRON_SECRET,
  payoutHoldDays: { digital: env.PAYOUT_HOLD_DAYS_DIGITAL, physical: env.PAYOUT_HOLD_DAYS_PHYSICAL },
  reservationMinutes: env.RESERVATION_MINUTES,
};
