'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { ProductArt } from '@/components/ProductArt';
import { QtyStepper } from '@/components/QtyStepper';
import { useCart } from '@/lib/cart';
import { getProduct, SELLERS } from '@/lib/catalog';
import { deliveryWindow, formatMoney } from '@/lib/format';

export function ProductView({ slug }: { slug: string }) {
  const product = getProduct(slug)!;
  const seller = SELLERS[product.sellerId];
  const firstAvailable = product.variants.find((v) => v.type === 'digital' || (v.stock ?? 0) > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const { add } = useCart();

  const variant = product.variants.find((v) => v.id === variantId)!;
  const isDigital = variant.type === 'digital';
  const outOfStock = !isDigital && (variant.stock ?? 0) === 0;
  const maxQty = isDigital ? 1 : (variant.stock ?? 1);

  function addToCart() {
    add(variant.id, isDigital ? 1 : qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pt-4">
      <Link href="/" className="text-sm text-ink/60">← Explorar</Link>

      <div className="mt-3 grid gap-6 md:grid-cols-2 md:gap-10">
        <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0">
          {[0, 25, 50, 75].map((shift, i) => (
            <ProductArt
              key={shift}
              hue={product.hue + shift / 5}
              label={`${product.title}, foto ${i + 1}`}
              className={`aspect-[4/5] w-[85%] shrink-0 snap-center rounded-2xl md:w-auto ${i === 0 ? 'md:col-span-2' : ''}`}
            />
          ))}
        </div>

        <div>
          <p className="text-sm text-ink/60">
            {seller.name} · {seller.city}
          </p>
          <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{product.title}</h1>
          <p className="mt-1 text-sm text-ink/70">
            ★ {product.rating.toFixed(1)} <span className="text-ink/50">({product.reviewCount} reseñas)</span>
          </p>

          <p className="mt-4 text-2xl font-semibold">{formatMoney(variant.priceCents)}</p>

          {/* El texto de entrega cambia con la variante: la dualidad se ve antes de comprar */}
          <div key={variant.id} className="animate-rise mt-3 rounded-xl bg-white p-3 ring-1 ring-black/5">
            <DeliveryBadge kind={variant.type} />
            <p className="mt-1.5 text-sm">
              {isDigital
                ? 'Disponible al instante en tu biblioteca y por correo.'
                : outOfStock
                  ? 'Agotado por ahora.'
                  : `${deliveryWindow(3, 5)} · envía ${seller.name} desde ${seller.city}`}
            </p>
            <p className="mt-0.5 text-xs text-ink/60">
              {isDigital
                ? [variant.format, variant.sizeLabel, variant.maxDownloads ? `${variant.maxDownloads} descargas` : 'descargas ilimitadas']
                    .filter(Boolean)
                    .join(' · ')
                : !outOfStock && (variant.stock ?? 0) <= 5
                  ? `Quedan ${variant.stock}`
                  : 'Envío calculado en el checkout'}
            </p>
          </div>

          {product.variants.length > 1 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium">Opción</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const soldOut = v.type === 'physical' && (v.stock ?? 0) === 0;
                  const selected = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setVariantId(v.id);
                        setQty(1);
                      }}
                      aria-pressed={selected}
                      className={`rounded-xl px-4 py-2 text-sm transition ${
                        selected ? 'bg-ink text-paper' : 'bg-white ring-1 ring-black/15'
                      } ${soldOut ? 'line-through opacity-50' : ''}`}
                    >
                      {v.name}
                      {new Set(product.variants.map((x) => x.priceCents)).size > 1 && (
                        <span className={selected ? 'text-paper/70' : 'text-ink/50'}> · {formatMoney(v.priceCents)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {!isDigital && !outOfStock && (
            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm font-medium">Cantidad</span>
              <QtyStepper value={qty} max={maxQty} onChange={(n) => setQty(Math.max(1, Math.min(maxQty, n)))} />
            </div>
          )}

          {product.sample && (
            <button onClick={() => setSampleOpen(true)} className="mt-5 text-sm font-medium text-digital underline underline-offset-4">
              {product.sample.label} — gratis
            </button>
          )}

          <div className="mt-6 space-y-3 border-t border-black/10 pt-5 text-sm">
            <p>{product.description}</p>
            <ul className="space-y-1 text-ink/80">
              {product.highlights.map((h) => (
                <li key={h}>· {h}</li>
              ))}
            </ul>
          </div>

          {/* Botón en página (escritorio) */}
          <button
            disabled={outOfStock}
            onClick={addToCart}
            className="mt-6 hidden w-full rounded-xl bg-ink py-3.5 font-medium text-paper disabled:opacity-40 md:block"
          >
            {outOfStock ? 'Agotado' : added ? 'Agregado ✓' : 'Agregar al carrito'}
          </button>
        </div>
      </div>

      {/* Barra fija inferior (móvil) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-black/10 bg-paper/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex-1">
          <p className="font-semibold">{formatMoney(variant.priceCents * (isDigital ? 1 : qty))}</p>
          <p className="text-xs text-ink/60">{variant.name}</p>
        </div>
        <button disabled={outOfStock} onClick={addToCart} className="rounded-xl bg-ink px-6 py-3 font-medium text-paper disabled:opacity-40">
          {outOfStock ? 'Agotado' : added ? 'Agregado ✓' : 'Agregar'}
        </button>
      </div>

      {added && (
        <div role="status" className="animate-rise fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center justify-between rounded-xl bg-ink px-4 py-3 text-sm text-paper shadow-lg md:bottom-8">
          Agregado al carrito
          <Link href="/carrito" className="font-semibold underline underline-offset-4">Ver carrito</Link>
        </div>
      )}

      {sampleOpen && product.sample && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setSampleOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Muestra gratuita" onClick={(e) => e.stopPropagation()} className="animate-rise w-full max-w-lg rounded-t-3xl bg-paper p-5 sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <DeliveryBadge kind="digital" />
                <h2 className="mt-2 font-display text-lg">Muestra gratuita</h2>
                <p className="text-sm text-ink/70">{product.sample.description}</p>
              </div>
              <button onClick={() => setSampleOpen(false)} aria-label="Cerrar" className="text-xl leading-none">×</button>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <ProductArt key={i} hue={product.hue + i * 6} className="aspect-[3/4] rounded-lg" label={`Página de muestra ${i + 1}`} />
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/60">
              La muestra es un archivo público aparte; el archivo completo solo se entrega tras la compra.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
