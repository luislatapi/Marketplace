/**
 * Datos de ejemplo: dos vendedores, un producto físico con variantes,
 * un producto digital y un libro que se vende en ambos formatos.
 */
import { prisma } from './index';

async function main() {
  const ropa = await prisma.category.upsert({ where: { slug: 'ropa' }, update: {}, create: { name: 'Ropa', slug: 'ropa' } });
  const libros = await prisma.category.upsert({ where: { slug: 'libros' }, update: {}, create: { name: 'Libros', slug: 'libros' } });

  const userA = await prisma.user.upsert({
    where: { email: 'tienda-a@example.com' },
    update: {},
    create: { email: 'tienda-a@example.com', fullName: 'Tienda A', roles: ['buyer', 'seller'] },
  });
  const userB = await prisma.user.upsert({
    where: { email: 'tienda-b@example.com' },
    update: {},
    create: { email: 'tienda-b@example.com', fullName: 'Tienda B', roles: ['buyer', 'seller'] },
  });
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: { email: 'admin@example.com', fullName: 'Admin', roles: ['admin'] },
  });

  const sellerA = await prisma.seller.upsert({
    where: { userId: userA.id },
    update: {},
    create: { userId: userA.id, storeName: 'Tienda A', slug: 'tienda-a', status: 'active' },
  });
  const sellerB = await prisma.seller.upsert({
    where: { userId: userB.id },
    update: {},
    create: { userId: userB.id, storeName: 'Tienda B', slug: 'tienda-b', status: 'active' },
  });

  // Producto físico con variantes de talla
  const camiseta = await prisma.product.upsert({
    where: { sellerId_slug: { sellerId: sellerA.id, slug: 'camiseta-basica' } },
    update: {},
    create: {
      sellerId: sellerA.id,
      categoryId: ropa.id,
      title: 'Camiseta básica de algodón',
      slug: 'camiseta-basica',
      status: 'active',
      deliveryMix: 'physical',
    },
  });
  for (const talla of ['S', 'M', 'L']) {
    const sku = `CAM-${talla}`;
    const exists = await prisma.productVariant.findUnique({ where: { productId_sku: { productId: camiseta.id, sku } } });
    if (exists) continue;
    await prisma.productVariant.create({
      data: {
        productId: camiseta.id,
        sku,
        fulfillmentType: 'physical',
        name: `Talla ${talla}`,
        options: { talla },
        priceCents: 50_000n,
        physical: { create: { stockOnHand: 20, weightGrams: 200, lengthCm: 30, widthCm: 25, heightCm: 2 } },
      },
    });
  }

  // Libro en dos formatos: impreso (Tienda B envía) y PDF (descarga)
  const existingAsset = await prisma.digitalAsset.findFirst({ where: { sellerId: sellerB.id, title: 'Guía de fotografía (PDF)' } });
  const asset = existingAsset ?? await prisma.digitalAsset.create({
    data: {
      sellerId: sellerB.id,
      title: 'Guía de fotografía (PDF)',
      versions: {
        create: {
          versionLabel: '1.0',
          storageKey: `vault/${sellerB.id}/demo/1.0/guia.pdf`,
          fileName: 'guia-fotografia.pdf',
          mimeType: 'application/pdf',
          scanStatus: 'approved',
          isCurrent: true,
        },
      },
    },
  });
  const libro = await prisma.product.upsert({
    where: { sellerId_slug: { sellerId: sellerB.id, slug: 'guia-fotografia' } },
    update: {},
    create: {
      sellerId: sellerB.id,
      categoryId: libros.id,
      title: 'Guía de fotografía',
      slug: 'guia-fotografia',
      status: 'active',
      deliveryMix: 'both',
    },
  });
  const pdf = await prisma.productVariant.findUnique({ where: { productId_sku: { productId: libro.id, sku: 'GUIA-PDF' } } });
  if (!pdf) {
    await prisma.productVariant.create({
      data: {
        productId: libro.id,
        sku: 'GUIA-PDF',
        fulfillmentType: 'digital',
        name: 'PDF',
        priceCents: 20_000n,
        digital: { create: { assetId: asset.id, maxDownloads: 5, updatesIncluded: true } },
      },
    });
    await prisma.productVariant.create({
      data: {
        productId: libro.id,
        sku: 'GUIA-IMPRESO',
        fulfillmentType: 'physical',
        name: 'Impreso',
        priceCents: 45_000n,
        physical: { create: { stockOnHand: 10, weightGrams: 600 } },
      },
    });
  }

  console.log('Seed listo: 2 vendedores, 1 admin, 2 productos (uno físico, uno físico + digital).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
