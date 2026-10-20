import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config';

// Los importes viven en BigInt (centavos); en JSON salen como número.
// Seguro mientras un importe no supere 2^53 centavos.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

async function bootstrap() {
  // rawBody es necesario para verificar la firma de los webhooks de Stripe.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const origins = config.webUrl.split(',').map((s) => s.trim());
  app.enableCors({ origin: origins, credentials: true, allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'] });
  app.enableShutdownHooks();
  await app.listen(config.port);
  console.log(`API escuchando en el puerto ${config.port}`);
}

bootstrap();
