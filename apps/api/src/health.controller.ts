import { Controller, Get, Inject } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { config } from './config';

/**
 * Estado de la API y de cada dependencia. Siempre responde 200 para poder diagnosticar
 * una instalación incompleta; el campo `status` indica si todo está listo.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  @Get()
  async health() {
    let database: 'ok' | 'missing' | 'error' = 'missing';
    let databaseError: string | undefined;
    if (process.env.DATABASE_URL) {
      try {
        await this.db.$queryRaw`SELECT 1`;
        database = 'ok';
      } catch (e) {
        database = 'error';
        databaseError = (e as Error).message.split('\n').find((l) => l.trim())?.slice(0, 200);
      }
    }

    const checks = {
      database,
      payments: config.stripe.enabled ? 'stripe' : 'demo',
      stripeWebhook: config.stripe.webhookSecret.startsWith('whsec_') && config.stripe.webhookSecret !== 'whsec_placeholder' ? 'ok' : 'missing',
      vault: config.blob.enabled ? 'ok' : 'missing',
      jwtSecret: config.jwtSecret === 'dev-only-secret-cambialo' ? 'default' : 'ok',
      cronSecret: config.cronSecret ? 'ok' : 'missing',
    };
    const ready = database === 'ok' && checks.vault === 'ok' && checks.jwtSecret === 'ok';
    return { status: ready ? 'ok' : 'incomplete', time: new Date().toISOString(), checks, ...(databaseError ? { databaseError } : {}) };
  }
}
