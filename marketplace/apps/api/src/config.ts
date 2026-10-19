import { z } from 'zod';

const env = z
  .object({
    API_PORT: z.coerce.number().default(4000),
    WEB_URL: z.string().default('http://localhost:3000'),
    JWT_SECRET: z.string().min(16).default('dev-only-secret-cambialo'),
    PLATFORM_COMMISSION_BPS: z.coerce.number().int().default(1500),
    STRIPE_SECRET_KEY: z.string().default('sk_test_placeholder'),
    STRIPE_WEBHOOK_SECRET: z.string().default('whsec_placeholder'),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),
    S3_BUCKET_PUBLIC: z.string().default('mkt-public-media'),
    S3_BUCKET_QUARANTINE: z.string().default('mkt-quarantine'),
    S3_BUCKET_VAULT: z.string().default('mkt-vault'),
    S3_BUCKET_PRIVATE_DOCS: z.string().default('mkt-private-docs'),
    PUBLIC_MEDIA_BASE_URL: z.string().default('http://localhost:9000/mkt-public-media'),
    VAULT_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(600),
  })
  .parse(process.env);

export const config = {
  apiPort: env.API_PORT,
  webUrl: env.WEB_URL,
  jwtSecret: env.JWT_SECRET,
  commissionBps: env.PLATFORM_COMMISSION_BPS,
  stripe: { secretKey: env.STRIPE_SECRET_KEY, webhookSecret: env.STRIPE_WEBHOOK_SECRET },
  s3: {
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
    buckets: {
      public: env.S3_BUCKET_PUBLIC,
      quarantine: env.S3_BUCKET_QUARANTINE,
      vault: env.S3_BUCKET_VAULT,
      privateDocs: env.S3_BUCKET_PRIVATE_DOCS,
    },
    publicBaseUrl: env.PUBLIC_MEDIA_BASE_URL,
    vaultTtlSeconds: env.VAULT_URL_TTL_SECONDS,
  },
};
