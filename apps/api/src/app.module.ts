import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { config } from './config';
import { AdminController } from './admin/admin.controller';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { AssetsController } from './catalog/assets.controller';
import { AdminProductsController, CatalogController, SellerProductsController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { CheckoutController } from './checkout/checkout.controller';
import { CheckoutService } from './checkout/checkout.service';
import { CurrentSeller } from './common/current-seller';
import { PrismaService } from './common/prisma.service';
import { FulfillmentService } from './fulfillment/fulfillment.service';
import { HealthController } from './health.controller';
import { LibraryService } from './library/library.service';
import { NotificationsService } from './notifications/notifications.service';
import { BuyerController, SellerOrdersController } from './orders/orders.controller';
import { OrdersService } from './orders/orders.service';
import { SellerOrdersService } from './orders/seller-orders.service';
import { PaymentEventsService } from './payments/payment-events.service';
import { StripeService } from './payments/stripe.service';
import { WebhooksController } from './payments/webhooks.controller';
import { CronController } from './payouts/cron.controller';
import { PayoutsService } from './payouts/payouts.service';
import { SellersController } from './sellers/sellers.controller';
import { SellersService } from './sellers/sellers.service';
import { StorageService } from './storage/storage.service';
import { UploadsController } from './storage/uploads.controller';

/**
 * Monolito modular. En Vercel corre como una sola función; el trabajo posterior al pago
 * (entrega, correos) se hace en la misma petición del webhook y las transferencias en un cron diario.
 */
@Module({
  imports: [JwtModule.register({ global: true, secret: config.jwtSecret, signOptions: { expiresIn: '7d' } })],
  controllers: [
    HealthController,
    AuthController,
    SellersController,
    CatalogController,
    SellerProductsController,
    AdminProductsController,
    AssetsController,
    UploadsController,
    CheckoutController,
    WebhooksController,
    BuyerController,
    SellerOrdersController,
    CronController,
    AdminController,
  ],
  providers: [
    PrismaService,
    AuthGuard,
    AuthService,
    CurrentSeller,
    SellersService,
    StripeService,
    PaymentEventsService,
    StorageService,
    CatalogService,
    CheckoutService,
    OrdersService,
    SellerOrdersService,
    FulfillmentService,
    NotificationsService,
    LibraryService,
    PayoutsService,
  ],
})
export class AppModule {}
