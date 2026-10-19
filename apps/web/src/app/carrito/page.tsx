'use client';

import Link from 'next/link';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { ProductArt } from '@/components/ProductArt';
import { QtyStepper } from '@/components/QtyStepper';
import { useCart, type CartLine } from '@/lib/cart';
import { formatMoney } from '@/lib/format';

function Line({ line }: { line: CartLine }) {
  const { setQty, remove } = useCart();
  const digital = line.variant.type === 'digital';
  return (
    <li className="flex gap-3 py-3">
      <Link href={`/p/${line.product.slug}`} className="shrink-0">
        <ProductArt hue={line.product.hue} className="h-20 w-16 rounded-lg" label={line.product.title} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium">{line.product.title}</p>
        <p className="text-xs text-ink/60">{line.variant.name}</p>
        <div className="mt-2 flex items-center justify-between">
          {digital ? (
            <span className="text-xs text-ink/60">Licencia única</span>
          ) : (
            <QtyStepper value={line.qty} max={line.variant.stock ?? 99} onChange={(n) => setQty(line.variantId, n)} />
          )}
          <span className="text-sm font-semibold">{formatMoney(line.lineCents)}</span>
        </div>
        <button onClick={() => remove(line.variantId)} className="mt-1 text-xs text-ink/50 underline">
          Quitar
        </button>
      </div>
    </li>
  );
}

export default function CartPage() {
  const cart = useCart();

  if (!cart.ready) return <main className="mx-auto max-w-2xl px-4 pt-6" aria-busy="true" />;

  if (cart.lines.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-16 text-center">
        <h1 className="font-display text-2xl">Tu carrito está vacío</h1>
        <p className="mt-2 text-sm text-ink/60">Puedes combinar productos físicos y digitales en una sola compra.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-medium text-paper">
          Explorar productos
        </Link>
      </main>
    );
  }

  const cheapestShipping = cart.physicalBySeller.reduce((s, g) => s + g.options[0].priceCents, 0);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <h1 className="font-display text-2xl">Carrito</h1>

      {cart.physicalBySeller.length > 0 && (
        <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Se envía a tu dirección</h2>
            <DeliveryBadge kind="physical" compact />
          </div>
          {cart.physicalBySeller.map((g) => (
            <div key={g.seller.id} className="mt-3 border-t border-black/5 pt-3">
              <p className="text-xs text-ink/60">
                Envía {g.seller.name} desde {g.seller.city} · envío desde {formatMoney(g.options[0].priceCents)}
              </p>
              <ul className="divide-y divide-black/5">
                {g.lines.map((l) => (
                  <Line key={l.variantId} line={l} />
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {cart.digitalLines.length > 0 && (
        <section className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-black/5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Entrega inmediata</h2>
            <DeliveryBadge kind="digital" compact />
          </div>
          <p className="mt-1 text-xs text-ink/60">Llegan a tu biblioteca y a tu correo en cuanto se confirme el pago.</p>
          <ul className="mt-1 divide-y divide-black/5">
            {cart.digitalLines.map((l) => (
              <Line key={l.variantId} line={l} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-5 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span>Productos</span>
          <span>{formatMoney(cart.subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-ink/70">
          <span>Envío</span>
          <span>{cart.requiresShipping ? `desde ${formatMoney(cheapestShipping)}` : 'No aplica'}</span>
        </div>
        <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold">
          <span>Total estimado</span>
          <span>{formatMoney(cart.subtotalCents + cheapestShipping)}</span>
        </div>
      </section>

      <Link href="/checkout" className="mt-5 block rounded-xl bg-ink py-3.5 text-center font-medium text-paper">
        Continuar al pago
      </Link>
      <p className="mt-2 text-center text-xs text-ink/50">Un solo pago para todo tu carrito.</p>
    </main>
  );
}
