import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  // rawBody es necesario para verificar la firma de los webhooks de Stripe.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({ origin: config.webUrl, credentials: true });
  await app.listen(config.apiPort);
  console.log(`API escuchando en http://localhost:${config.apiPort}`);
}

bootstrap();
