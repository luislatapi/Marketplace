/**
 * Catálogo de muestra (Fase 1, sin backend). La forma de los datos imita la API:
 * un producto común con variantes que son físicas o digitales.
 */

export type FulfillmentType = 'physical' | 'digital';
export type DeliveryMix = FulfillmentType | 'both';

export interface Seller {
  id: string;
  name: string;
  city: string;
  rating: number;
}

export interface Variant {
  id: string;
  name: string;
  type: FulfillmentType;
  priceCents: number;
  /** Físico */
  stock?: number;
  weightGrams?: number;
  /** Digital */
  format?: string;
  sizeLabel?: string;
  maxDownloads?: number | null;
}

export interface Product {
  slug: string;
  title: string;
  sellerId: string;
  category: string;
  description: string;
  highlights: string[];
  hue: number;
  rating: number;
  reviewCount: number;
  sample?: { label: string; description: string };
  variants: Variant[];
}

export const SELLERS: Record<string, Seller> = {
  'algodon-norte': { id: 'algodon-norte', name: 'Algodón Norte', city: 'Monterrey', rating: 4.8 },
  'lente-abierto': { id: 'lente-abierto', name: 'Lente Abierto', city: 'CDMX', rating: 4.9 },
  'estudio-orden': { id: 'estudio-orden', name: 'Estudio Orden', city: 'Guadalajara', rating: 4.7 },
  'taller-barro': { id: 'taller-barro', name: 'Taller Barro', city: 'Oaxaca', rating: 4.9 },
  'academia-comercio': { id: 'academia-comercio', name: 'Academia Comercio', city: 'CDMX', rating: 4.8 },
};

export const CATEGORIES = ['Ropa', 'Libros', 'Plantillas', 'Hogar', 'Cursos', 'Papelería'] as const;

export const PRODUCTS: Product[] = [
  {
    slug: 'camiseta-basica',
    title: 'Camiseta básica de algodón peinado',
    sellerId: 'algodon-norte',
    category: 'Ropa',
    description: 'Corte recto, algodón peinado de 180 g y costuras reforzadas. Teñida en lotes pequeños.',
    highlights: ['100 % algodón peinado', 'Hecha en Monterrey', 'Cambios de talla gratis en 30 días'],
    hue: 30,
    rating: 4.7,
    reviewCount: 128,
    variants: [
      { id: 'cam-s', name: 'Talla S', type: 'physical', priceCents: 50_000, stock: 12, weightGrams: 200 },
      { id: 'cam-m', name: 'Talla M', type: 'physical', priceCents: 50_000, stock: 3, weightGrams: 210 },
      { id: 'cam-l', name: 'Talla L', type: 'physical', priceCents: 50_000, stock: 0, weightGrams: 220 },
    ],
  },
  {
    slug: 'guia-fotografia',
    title: 'Guía de fotografía con el celular',
    sellerId: 'lente-abierto',
    category: 'Libros',
    description: '180 páginas de ejercicios para dominar luz, composición y edición desde tu teléfono.',
    highlights: ['12 capítulos con ejercicios', 'Edición impresa a color', 'El PDF incluye actualizaciones'],
    hue: 260,
    rating: 4.9,
    reviewCount: 342,
    sample: { label: 'Leer las primeras 12 páginas', description: 'Introducción y capítulo 1: entender la luz.' },
    variants: [
      { id: 'guia-pdf', name: 'PDF', type: 'digital', priceCents: 20_000, format: 'PDF', sizeLabel: '48 MB', maxDownloads: 5 },
      { id: 'guia-impreso', name: 'Impreso', type: 'physical', priceCents: 45_000, stock: 25, weightGrams: 600 },
    ],
  },
  {
    slug: 'plantillas-negocio',
    title: 'Plantillas para organizar tu negocio',
    sellerId: 'estudio-orden',
    category: 'Plantillas',
    description: 'Sistema de 14 plantillas: finanzas, inventario, clientes y calendario de contenido.',
    highlights: ['Notion y Google Sheets', 'Video de instalación de 8 min', 'Licencia para un negocio'],
    hue: 280,
    rating: 4.6,
    reviewCount: 87,
    sample: { label: 'Ver vista previa', description: 'Capturas de las 14 plantillas y del tablero principal.' },
    variants: [
      { id: 'plan-basic', name: 'Licencia individual', type: 'digital', priceCents: 15_000, format: 'ZIP', sizeLabel: '12 MB', maxDownloads: null },
      { id: 'plan-team', name: 'Licencia equipo (5)', type: 'digital', priceCents: 45_000, format: 'ZIP', sizeLabel: '12 MB', maxDownloads: null },
    ],
  },
  {
    slug: 'taza-ceramica',
    title: 'Taza de cerámica hecha a mano',
    sellerId: 'taller-barro',
    category: 'Hogar',
    description: 'Barro rojo de Oaxaca con esmalte sin plomo. Cada pieza es única; 350 ml.',
    highlights: ['Esmalte libre de plomo', 'Apta para microondas', 'Empaque reforzado'],
    hue: 15,
    rating: 4.6,
    reviewCount: 56,
    variants: [
      { id: 'taza-terracota', name: 'Terracota', type: 'physical', priceCents: 32_000, stock: 8, weightGrams: 450 },
      { id: 'taza-azul', name: 'Azul cobalto', type: 'physical', priceCents: 34_000, stock: 5, weightGrams: 450 },
    ],
  },
  {
    slug: 'curso-ia-ecommerce',
    title: 'Curso: IA aplicada al ecommerce',
    sellerId: 'academia-comercio',
    category: 'Cursos',
    description: '6 módulos en video para usar IA en fichas de producto, anuncios y atención al cliente.',
    highlights: ['6 h de video', 'Plantillas de prompts', 'Acceso permanente'],
    hue: 240,
    rating: 4.8,
    reviewCount: 210,
    sample: { label: 'Ver la primera lección', description: 'Lección 1: qué tareas de tu tienda puede hacer la IA (9 min).' },
    variants: [{ id: 'curso-acceso', name: 'Acceso al curso', type: 'digital', priceCents: 99_000, format: 'Streaming + PDF', maxDownloads: null }],
  },
  {
    slug: 'libreta-piel',
    title: 'Libreta de piel cosida a mano',
    sellerId: 'taller-barro',
    category: 'Papelería',
    description: 'Piel curtida al vegetal y 160 hojas de papel de algodón. Se puede rellenar.',
    highlights: ['Tamaño A5', 'Papel de 120 g', 'Grabado opcional'],
    hue: 40,
    rating: 4.9,
    reviewCount: 74,
    variants: [{ id: 'libreta-a5', name: 'A5', type: 'physical', priceCents: 41_000, stock: 14, weightGrams: 380 }],
  },
  {
    slug: 'planner-imprimible',
    title: 'Planner anual imprimible 2027',
    sellerId: 'estudio-orden',
    category: 'Papelería',
    description: 'Planner de 120 páginas en PDF para imprimir en casa o usar en tablet.',
    highlights: ['Tamaño carta y A5', 'Hipervínculos para tablet', 'Se actualiza cada año'],
    hue: 300,
    rating: 4.7,
    reviewCount: 41,
    sample: { label: 'Ver 4 páginas', description: 'Portada, vista mensual, semanal y hábitos.' },
    variants: [{ id: 'planner-pdf', name: 'PDF', type: 'digital', priceCents: 9_900, format: 'PDF', sizeLabel: '22 MB', maxDownloads: 10 }],
  },
  {
    slug: 'sudadera-heavy',
    title: 'Sudadera heavyweight',
    sellerId: 'algodon-norte',
    category: 'Ropa',
    description: 'Felpa de 400 g, capucha doble y puños con elastano. Hecha para durar años.',
    highlights: ['Felpa perchada', 'Lavado previo, no encoge', 'Hecha en Monterrey'],
    hue: 210,
    rating: 4.8,
    reviewCount: 93,
    variants: [
      { id: 'sud-m', name: 'Talla M', type: 'physical', priceCents: 89_000, stock: 6, weightGrams: 700 },
      { id: 'sud-l', name: 'Talla L', type: 'physical', priceCents: 89_000, stock: 9, weightGrams: 730 },
    ],
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function findVariant(variantId: string) {
  for (const product of PRODUCTS) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant, seller: SELLERS[product.sellerId] };
  }
  return undefined;
}

export function deliveryMix(p: Product): DeliveryMix {
  const phys = p.variants.some((v) => v.type === 'physical');
  const dig = p.variants.some((v) => v.type === 'digital');
  return phys && dig ? 'both' : dig ? 'digital' : 'physical';
}

export function minPrice(p: Product) {
  return Math.min(...p.variants.map((v) => v.priceCents));
}
