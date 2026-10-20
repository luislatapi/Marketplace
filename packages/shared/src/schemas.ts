import { z } from 'zod';

/** Validaciones compartidas entre la web y la API. */

export const fulfillmentTypeSchema = z.enum(['physical', 'digital']);

const baseVariant = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().max(120).optional(),
  options: z.record(z.string()).default({}),
  priceCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default('MXN'),
});

export const physicalVariantSchema = baseVariant.extend({
  fulfillmentType: z.literal('physical'),
  stockOnHand: z.number().int().nonnegative(),
  weightGrams: z.number().int().positive(),
  lengthCm: z.number().positive().optional(),
  widthCm: z.number().positive().optional(),
  heightCm: z.number().positive().optional(),
});

export const digitalVariantSchema = baseVariant.extend({
  fulfillmentType: z.literal('digital'),
  assetId: z.string().uuid(),
  deliveryKind: z.enum(['download', 'license_key', 'course_access']).default('download'),
  maxDownloads: z.number().int().positive().nullable().default(null),
  accessDays: z.number().int().positive().nullable().default(null),
  updatesIncluded: z.boolean().default(true),
});

/** Unión discriminada: el tipo de entrega decide qué campos son obligatorios. */
export const variantInputSchema = z.discriminatedUnion('fulfillmentType', [physicalVariantSchema, digitalVariantSchema]);

export const productInputSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(10_000).optional(),
  categoryId: z.string().uuid().optional(),
  attributes: z.record(z.string()).default({}),
  variants: z.array(variantInputSchema).min(1).max(100),
});

export const uploadRequestSchema = z.object({
  purpose: z.enum(['product_image', 'sample', 'digital_asset', 'seller_document']),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(127),
  sizeBytes: z.number().int().positive().max(5 * 1024 ** 3), // hasta 5 GB
});

export const checkoutInputSchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  /** Opción de envío elegida por vendedor (solo vendedores con productos físicos). */
  shipping: z.record(z.enum(['standard', 'express'])).default({}),
  email: z.string().email(),
  address: z
    .object({
      name: z.string().min(2).max(120),
      phone: z.string().min(7).max(20),
      line1: z.string().min(5).max(200),
      city: z.string().min(2).max(80),
      state: z.string().min(2).max(80),
      postalCode: z.string().regex(/^\d{5}$/),
      country: z.string().length(2).default('MX'),
    })
    .optional(),
});

export const productQuerySchema = z.object({
  q: z.string().max(100).optional(),
  type: z.enum(['all', 'physical', 'digital']).default('all'),
  category: z.string().max(60).optional(),
  maxPriceCents: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;
export type VariantInput = z.infer<typeof variantInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;

/** Deriva el campo products.delivery_mix para los filtros del buscador. */
export function deliveryMix(variants: Pick<VariantInput, 'fulfillmentType'>[]): 'physical' | 'digital' | 'both' {
  const p = variants.some((v) => v.fulfillmentType === 'physical');
  const d = variants.some((v) => v.fulfillmentType === 'digital');
  return p && d ? 'both' : d ? 'digital' : 'physical';
}
