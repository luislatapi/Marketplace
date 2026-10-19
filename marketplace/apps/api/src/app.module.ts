import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from './config';
import { PrismaService } from './common/prisma.service';
import { HealthController } from './health.controller';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { SellersController } from './sellers/sellers.controller';
import { SellersService } from './sellers/sellers.service';
import { StripeService } from './payments/stripe.service';
import { WebhooksController } from './payments/webhooks.controller';
import { PaymentEventsService } from './payments/payment-events.service';
import { StorageService } from './storage/storage.service';
import { UploadsController } from './storage/uploads.controller';

/**
 * Monolito modular (Fase 0). Cada carpeta es un módulo con su propia frontera;
 * en fases posteriores se agregan Catálogo, Checkout, Pedidos, Cumplimiento, Biblioteca.
 */
@Module({
  imports: [JwtModule.register({ global: true, secret: config.jwtSecret, signOptions: { expiresIn: '7d' } })],
  controllers: [HealthController, AuthController, SellersController, WebhooksController, UploadsController],
  providers: [PrismaService, AuthService, SellersService, StripeService, PaymentEventsService, StorageService],
})
export class AppModule {}
