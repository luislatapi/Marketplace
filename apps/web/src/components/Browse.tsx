'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, deliveryMix, minPrice, PRODUCTS, SELLERS } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
import { ProductCard } from './ProductCard';

const TYPES = [
  { id: 'all', label: 'Todo' },
  { id: 'physical', label: 'Físico' },
  { id: 'digital', label: 'Digital' },
] as const;
type TypeId = (typeof TYPES)[number]['id'];

const PRICE_CAP = Math.ceil(Math.max(...PRODUCTS.map(minPrice)) / 10_000) * 10_000;

function normalize(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function Browse() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeId>('all');
  const [category, setCategory] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState(PRICE_CAP);
  const [sheet, setSheet] = useState(false);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    return PRODUCTS.filter((p) => {
      const mix = deliveryMix(p);
      if (type !== 'all' && mix !== type && mix !== 'both') return false;
      if (category && p.category !== category) return false;
      if (minPrice(p) > maxPrice) return false;
      if (!q) return true;
      return normalize(`${p.title} ${p.category} ${SELLERS[p.sellerId].name}`).includes(q);
    });
  }, [query, type, category, maxPrice]);

  const activeFilters = (category ? 1 : 0) + (maxPrice < PRICE_CAP ? 1 : 0);

  return (
    <>
      <label className="block">
        <span className="sr-only">Buscar productos</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca productos, archivos o cursos"
          className="w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-black/10 placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-ink"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <div role="tablist" aria-label="Tipo de producto" className="scrollbar-none flex flex-1 gap-2 overflow-x-auto">
          {TYPES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={type === t.id}
              onClick={() => setType(t.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
                type === t.id ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => setSheet(true)} className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm ring-1 ring-black/10">
          Filtros{activeFilters > 0 && ` · ${activeFilters}`}
        </button>
      </div>

      <p className="mt-4 text-xs text-ink/60" aria-live="polite">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
      </p>

      {results.length === 0 ? (
        <div className="mt-10 text-center text-sm text-ink/60">
          <p>No encontramos productos con esos filtros.</p>
          <button
            className="mt-3 underline"
            onClick={() => {
              setQuery('');
              setType('all');
              setCategory(null);
              setMaxPrice(PRICE_CAP);
            }}
          >
            Quitar filtros
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((p) => (
            <div key={p.slug} className="animate-rise">
              <ProductCard p={p} />
            </div>
          ))}
        </div>
      )}

      {sheet && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/30 sm:items-center" onClick={() => setSheet(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros"
            onClick={(e) => e.stopPropagation()}
            className="animate-rise w-full max-w-md rounded-t-3xl bg-paper p-5 pb-8 sm:rounded-3xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-black/15 sm:hidden" />
            <h2 className="font-display text-lg">Filtros</h2>

            <fieldset className="mt-4">
              <legend className="text-sm font-medium">Categoría</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(category === c ? null : c)}
                    className={`rounded-full px-3 py-1.5 text-sm ${category === c ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/10'}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-5 block text-sm font-medium">
              Precio máximo: {formatMoney(maxPrice)}
              <input
                type="range"
                min={5_000}
                max={PRICE_CAP}
                step={5_000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-2 w-full accent-ink"
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setCategory(null);
                  setMaxPrice(PRICE_CAP);
                }}
                className="flex-1 rounded-xl py-3 text-sm ring-1 ring-black/15"
              >
                Limpiar
              </button>
              <button onClick={() => setSheet(false)} className="flex-1 rounded-xl bg-ink py-3 text-sm font-medium text-paper">
                Ver {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
