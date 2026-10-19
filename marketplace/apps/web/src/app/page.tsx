import { TypeFilter } from '@/components/TypeFilter';
import type { ProductCardData } from '@/components/ProductCard';

// Fase 0: datos de muestra. En la Fase 1 vienen de la API (Meilisearch) con ISR.
const SAMPLE: ProductCardData[] = [
  { slug: 'camiseta-basica', title: 'Camiseta básica de algodón', sellerName: 'Tienda A', priceCents: 50_000, currency: 'MXN', deliveryMix: 'physical', rating: 4.7, imageHue: 30 },
  { slug: 'guia-fotografia', title: 'Guía de fotografía', sellerName: 'Tienda B', priceCents: 20_000, currency: 'MXN', deliveryMix: 'both', rating: 4.9, imageHue: 260 },
  { slug: 'plantillas-notion', title: 'Plantillas para organizar tu negocio', sellerName: 'Estudio C', priceCents: 15_000, currency: 'MXN', deliveryMix: 'digital', imageHue: 280 },
  { slug: 'taza-ceramica', title: 'Taza de cerámica hecha a mano', sellerName: 'Taller D', priceCents: 32_000, currency: 'MXN', deliveryMix: 'physical', rating: 4.6, imageHue: 15 },
  { slug: 'curso-ia-ecommerce', title: 'Curso: IA aplicada al ecommerce', sellerName: 'Academia E', priceCents: 99_000, currency: 'MXN', deliveryMix: 'digital', rating: 4.8, imageHue: 240 },
  { slug: 'libreta-piel', title: 'Libreta de piel cosida', sellerName: 'Taller D', priceCents: 41_000, currency: 'MXN', deliveryMix: 'physical', imageHue: 40 },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 pb-24">
      <header className="sticky top-0 z-10 -mx-4 bg-paper/90 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <span className="font-display text-xl font-semibold tracking-tight">mercado</span>
          <a href="/carrito" className="rounded-full bg-white px-3 py-1.5 text-sm ring-1 ring-black/10">Carrito</a>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Buscar productos</span>
          <input
            type="search"
            placeholder="Busca productos, archivos o cursos"
            className="w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-black/10 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink"
          />
        </label>
      </header>

      <section className="mt-2">
        <h1 className="font-display text-2xl leading-tight">Hecho por vendedores independientes.<br />Llega a tu puerta o a tu correo.</h1>
        <div className="mt-4">
          <TypeFilter products={SAMPLE} />
        </div>
      </section>
    </main>
  );
}
