import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Inject } from '@nestjs/common';
import { deliveryMix, type ProductInput, type ProductQuery } from '@mkt/shared';
import type { Prisma } from '@mkt/db';
import { PrismaService } from '../common/prisma.service';

const PAGE_SIZE = 24;

const publicInclude = {
  seller: { select: { id: true, storeName: true, slug: true, ratingAvg: true } },
  category: { select: { name: true, slug: true } },
  media: { orderBy: { position: 'asc' } },
  variants: {
    where: { isActive: true },
    include: {
      physical: { select: { stockOnHand: true, stockReserved: true, weightGrams: true } },
      digital: { select: { deliveryKind: true, maxDownloads: true, accessDays: true, updatesIncluded: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type PublicProduct = Prisma.ProductGetPayload<{ include: typeof publicInclude }>;

function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80);
}

/** Forma pública: oculta stock exacto y cualquier dato de la bóveda. */
export function toPublicProduct(p: PublicProduct) {
  const variants = p.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    name: v.name,
    type: v.fulfillmentType,
    options: v.options,
    priceCents: Number(v.priceCents),
    currency: v.currency,
    available: v.fulfillmentType === 'digital' ? true : (v.physical?.stockOnHand ?? 0) - (v.physical?.stockReserved ?? 0),
    weightGrams: v.physical?.weightGrams,
    digital: v.digital ?? undefined,
  }));
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    attributes: p.attributes,
    deliveryMix: p.deliveryMix,
    category: p.category,
    seller: { ...p.seller, ratingAvg: Number(p.seller.ratingAvg) },
    media: p.media.map((m) => ({ kind: m.kind, url: m.publicUrl, alt: m.altText })),
    minPriceCents: Math.min(...variants.map((v) => v.priceCents)),
    variants,
  };
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  async list(q: ProductQuery) {
    const where: Prisma.ProductWhereInput = { status: 'active' };
    if (q.type !== 'all') where.deliveryMix = { in: [q.type, 'both'] };
    if (q.category) where.category = { slug: q.category };
    if (q.q) where.OR = [{ title: { contains: q.q, mode: 'insensitive' } }, { seller: { storeName: { contains: q.q, mode: 'insensitive' } } }];
    if (q.maxPriceCents) where.variants = { some: { isActive: true, priceCents: { lte: BigInt(q.maxPriceCents) } } };

    const [total, rows] = await this.db.$transaction([
      this.db.product.count({ where }),
      this.db.product.findMany({ where, include: publicInclude, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    ]);
    return { total, page: q.page, pageSize: PAGE_SIZE, items: rows.filter((p) => p.variants.length).map(toPublicProduct) };
  }

  async bySlug(slug: string) {
    const p = await this.db.product.findFirst({ where: { slug, status: 'active' }, include: publicInclude });
    if (!p || !p.variants.length) throw new NotFoundException('Producto no encontrado');
    return toPublicProduct(p);
  }

  categories() {
    return this.db.category.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, slug: true } });
  }

  // ───────────── Vendedor ─────────────

  async create(sellerId: string, input: ProductInput) {
    const digitalAssetIds = input.variants.flatMap((v) => (v.fulfillmentType === 'digital' ? [v.assetId] : []));
    if (digitalAssetIds.length) {
      const assets = await this.db.digitalAsset.findMany({
        where: { id: { in: digitalAssetIds }, sellerId },
        include: { versions: { where: { isCurrent: true, scanStatus: { in: ['clean', 'approved'] } } } },
      });
      for (const id of digitalAssetIds) {
        const a = assets.find((x) => x.id === id);
        if (!a) throw new ForbiddenException('Uno de los archivos no pertenece a tu tienda');
        if (!a.versions.length) throw new BadRequestException('Uno de los archivos aún no tiene una versión verificada');
      }
    }
    const skus = input.variants.map((v) => v.sku);
    if (new Set(skus).size !== skus.length) throw new BadRequestException('Los SKU deben ser únicos dentro del producto');

    const base = slugify(input.title) || 'producto';
    const taken = await this.db.product.count({ where: { sellerId, slug: { startsWith: base } } });

    return this.db.product.create({
      data: {
        sellerId,
        title: input.title,
        slug: taken ? `${base}-${taken + 1}` : base,
        description: input.description,
        categoryId: input.categoryId,
        attributes: input.attributes,
        deliveryMix: deliveryMix(input.variants),
        status: 'draft',
        variants: {
          create: input.variants.map((v) => ({
            sku: v.sku,
            name: v.name,
            options: v.options,
            priceCents: BigInt(v.priceCents),
            currency: v.currency,
            fulfillmentType: v.fulfillmentType,
            ...(v.fulfillmentType === 'physical'
              ? {
                  physical: {
                    create: { stockOnHand: v.stockOnHand, weightGrams: v.weightGrams, lengthCm: v.lengthCm, widthCm: v.widthCm, heightCm: v.heightCm },
                  },
                }
              : {
                  digital: {
                    create: {
                      assetId: v.assetId,
                      deliveryKind: v.deliveryKind,
                      maxDownloads: v.maxDownloads,
                      accessDays: v.accessDays,
                      updatesIncluded: v.updatesIncluded,
                    },
                  },
                }),
          })),
        },
      },
      include: { variants: { include: { physical: true, digital: true } } },
    });
  }

  /** Los primeros productos de una tienda pasan por revisión; después se publican directo. */
  async submit(sellerId: string, productId: string) {
    const product = await this.db.product.findFirst({ where: { id: productId, sellerId } });
    if (!product) throw new NotFoundException();
    if (!['draft', 'rejected'].includes(product.status)) throw new BadRequestException(`El producto está en estado ${product.status}`);
    const approvedBefore = await this.db.product.count({ where: { sellerId, status: 'active' } });
    const status = approvedBefore >= 3 ? 'active' : 'in_review';
    return this.db.product.update({ where: { id: productId }, data: { status } });
  }

  mine(sellerId: string) {
    return this.db.product.findMany({
      where: { sellerId, status: { not: 'archived' } },
      include: { variants: { include: { physical: true, digital: true } }, media: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStock(sellerId: string, variantId: string, stockOnHand: number) {
    const variant = await this.db.productVariant.findFirst({ where: { id: variantId, product: { sellerId }, fulfillmentType: 'physical' }, include: { physical: true } });
    if (!variant?.physical) throw new NotFoundException();
    if (stockOnHand < variant.physical.stockReserved) {
      throw new BadRequestException(`Hay ${variant.physical.stockReserved} unidades reservadas en pedidos pendientes`);
    }
    return this.db.physicalSpec.update({ where: { variantId }, data: { stockOnHand } });
  }

  // ───────────── Moderación ─────────────

  reviewQueue() {
    return this.db.product.findMany({ where: { status: 'in_review' }, include: publicInclude, orderBy: { createdAt: 'asc' } });
  }

  async moderate(productId: string, decision: 'approve' | 'reject') {
    const product = await this.db.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'in_review') throw new BadRequestException('El producto no está en revisión');
    return this.db.product.update({ where: { id: productId }, data: { status: decision === 'approve' ? 'active' : 'rejected' } });
  }
}
