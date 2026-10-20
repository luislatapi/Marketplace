import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { productInputSchema, productQuerySchema, type ProductInput, type ProductQuery } from '@mkt/shared';
import { z } from 'zod';
import { AuthGuard, CurrentUser, Roles, type AuthUser } from '../auth/auth.guard';
import { CurrentSeller } from '../common/current-seller';
import { ZodPipe } from '../common/zod.pipe';
import { CatalogService } from './catalog.service';

@Controller('products')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@Query(new ZodPipe(productQuerySchema)) q: ProductQuery) {
    return this.catalog.list(q);
  }

  @Get('categories')
  categories() {
    return this.catalog.categories();
  }

  @Get(':slug')
  bySlug(@Param('slug') slug: string) {
    return this.catalog.bySlug(slug);
  }
}

@Controller('seller/products')
@UseGuards(AuthGuard)
@Roles('seller')
export class SellerProductsController {
  constructor(private readonly catalog: CatalogService, private readonly current: CurrentSeller) {}

  @Get()
  async mine(@CurrentUser() user: AuthUser) {
    return this.catalog.mine(await this.current.id(user));
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body(new ZodPipe(productInputSchema)) body: ProductInput) {
    return this.catalog.create(await this.current.id(user), body);
  }

  @Post(':id/submit')
  async submit(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.submit(await this.current.id(user), id);
  }

  @Patch('variants/:variantId/stock')
  async stock(
    @CurrentUser() user: AuthUser,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body(new ZodPipe(z.object({ stockOnHand: z.number().int().min(0) }))) body: { stockOnHand: number },
  ) {
    return this.catalog.updateStock(await this.current.id(user), variantId, body.stockOnHand);
  }
}

@Controller('admin/products')
@UseGuards(AuthGuard)
@Roles('admin', 'moderator')
export class AdminProductsController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('review')
  queue() {
    return this.catalog.reviewQueue();
  }

  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.moderate(id, 'approve');
  }

  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalog.moderate(id, 'reject');
  }
}
