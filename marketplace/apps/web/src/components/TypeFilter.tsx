'use client';

import { useState } from 'react';
import { ProductCard, type ProductCardData } from './ProductCard';

const FILTERS = [
  { id: 'all', label: 'Todo' },
  { id: 'physical', label: 'Físico' },
  { id: 'digital', label: 'Digital' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

export function TypeFilter({ products }: { products: ProductCardData[] }) {
  const [filter, setFilter] = useState<FilterId>('all');
  const visible = products.filter(
    (p) => filter === 'all' || p.deliveryMix === filter || p.deliveryMix === 'both',
  );

  return (
    <>
      <div role="tablist" aria-label="Tipo de producto" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === f.id ? 'bg-ink text-paper' : 'bg-white text-ink ring-1 ring-black/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((p) => (
          <ProductCard key={p.slug} p={p} />
        ))}
      </div>
    </>
  );
}
