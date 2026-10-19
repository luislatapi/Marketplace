'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { useCart } from '@/lib/cart';
import { deliveryWindow, formatMoney } from '@/lib/format';
import { newOrderIds, saveOrder, type Order } from '@/lib/orders';
import type { ShippingOption } from '@/lib/shipping';

const field = 'w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-black/15 focus:outline-none focus:ring-2 focus:ring-ink';

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <h2 className="flex items-center gap-2 font-medium">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-paper">{n}</span>
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function CheckoutPage() {
  const cart = useCart();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [addr, setAddr] = useState({ name: '', phone: '', line1: '', city: '', state: '', postalCode: '' });
  const [choice, setChoice] = useState<Record<string, ShippingOption['id']>>({});
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El aviso desaparece en cuanto el comprador corrige algo.
  useEffect(() => setError(null), [email, addr, choice]);

  if (!cart.ready) return <main className="mx-auto max-w-2xl px-4" aria-busy="true" />;
  if (cart.lines.length === 0 && !paying) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-16 text-center">
        <p>No hay nada que pagar.</p>
        <Link href="/" className="mt-4 inline-block underline">Volver a explorar</Link>
      </main>
    );
  }

  const shipments = cart.physicalBySeller.map((g) => {
    const opt = g.options.find((o) => o.id === (choice[g.seller.id] ?? 'standard'))!;
    return { ...g, opt };
  });
  const shippingCents = shipments.reduce((s, g) => s + g.opt.priceCents, 0);
  const totalCents = cart.subtotalCents + shippingCents;

  function validate() {
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Escribe un correo válido: ahí llegan tus descargas y el rastreo.';
    if (cart.requiresShipping) {
      if (Object.values(addr).some((v) => !v.trim())) return 'Completa la dirección de envío.';
      if (!/^\d{5}$/.test(addr.postalCode)) return 'El código postal debe tener 5 dígitos.';
    }
    return null;
  }

  function pay() {
    const err = validate();
    setError(err);
    if (err) return;
    setPaying(true);

    const { id, number } = newOrderIds();
    const order: Order = {
      id,
      number,
      createdAt: new Date().toISOString(),
      email,
      address: cart.requiresShipping ? addr : undefined,
      subtotalCents: cart.subtotalCents,
      shippingCents,
      totalCents,
      sellerOrders: [
        ...shipments.map((g) => ({
          sellerId: g.seller.id,
          sellerName: g.seller.name,
          shippingCents: g.opt.priceCents,
          shippingLabel: g.opt.label,
          minDays: g.opt.minDays,
          maxDays: g.opt.maxDays,
          trackingNumber: `MX${Math.floor(Math.random() * 1e10)}`,
          lines: g.lines.map(toOrderLine),
        })),
        // Vendedores con solo digitales: sub-pedido sin envío.
        ...groupDigitalBySeller(cart.digitalLines, shipments.map((s) => s.seller.id)),
      ],
    };
    // Digitales de un vendedor que también envía físicos: se agregan a su mismo sub-pedido.
    for (const so of order.sellerOrders) {
      if (so.shippingCents > 0) {
        so.lines.push(...cart.digitalLines.filter((l) => l.seller.id === so.sellerId).map(toOrderLine));
      }
    }

    // En producción: se crea el PaymentIntent y el pedido se confirma solo por webhook.
    setTimeout(() => {
      saveOrder(order);
      cart.clear();
      router.push(`/pedido/${order.id}`);
    }, 900);
  }

  return (
    <main className="mx-auto max-w-2xl px-4">
      <h1 className="font-display text-2xl">Pagar</h1>

      <details className="mt-3 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-black/5">
        <summary className="flex cursor-pointer list-none justify-between">
          <span>
            {cart.count} {cart.count === 1 ? 'artículo' : 'artículos'} · ver resumen
          </span>
          <span className="font-semibold">{formatMoney(totalCents)}</span>
        </summary>
        <ul className="mt-3 space-y-1.5">
          {cart.lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3">
              <span className="truncate">
                {l.qty > 1 && `${l.qty} × `}
                {l.product.title} <span className="text-ink/50">· {l.variant.name}</span>
              </span>
              <span>{formatMoney(l.lineCents)}</span>
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-4 space-y-4">
        <Step n={1} title="Correo">
          <input type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
          {cart.digitalLines.length > 0 && <p className="mt-2 text-xs text-ink/60">Aquí te enviamos el acceso a tus productos digitales.</p>}
        </Step>

        {cart.requiresShipping ? (
          <>
            <Step n={2} title="Dirección de envío">
              <div className="grid grid-cols-2 gap-2">
                <input className={`${field} col-span-2`} autoComplete="name" placeholder="Nombre de quien recibe" value={addr.name} onChange={(e) => setAddr({ ...addr, name: e.target.value })} />
                <input className={`${field} col-span-2`} autoComplete="street-address" placeholder="Calle, número y colonia" value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
                <input className={field} autoComplete="address-level2" placeholder="Ciudad" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
                <input className={field} autoComplete="address-level1" placeholder="Estado" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} />
                <input className={field} autoComplete="postal-code" inputMode="numeric" maxLength={5} placeholder="C.P." value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value.replace(/\D/g, '') })} />
                <input className={field} autoComplete="tel" inputMode="tel" placeholder="Teléfono" value={addr.phone} onChange={(e) => setAddr({ ...addr, phone: e.target.value })} />
              </div>
            </Step>

            <Step n={3} title="Envío">
              <div className="space-y-4">
                {shipments.map((g) => (
                  <fieldset key={g.seller.id}>
                    <legend className="text-xs text-ink/60">
                      {g.seller.name} · {g.lines.reduce((s, l) => s + l.qty, 0)} artículo(s)
                    </legend>
                    <div className="mt-1.5 space-y-2">
                      {g.options.map((o) => (
                        <label key={o.id} className={`flex cursor-pointer items-center gap-3 rounded-xl p-3 ring-1 ${g.opt.id === o.id ? 'ring-2 ring-ink' : 'ring-black/15'}`}>
                          <input type="radio" name={`ship-${g.seller.id}`} checked={g.opt.id === o.id} onChange={() => setChoice({ ...choice, [g.seller.id]: o.id })} className="accent-ink" />
                          <span className="flex-1 text-sm">
                            {o.label}
                            <span className="block text-xs text-ink/60">{deliveryWindow(o.minDays, o.maxDays)}</span>
                          </span>
                          <span className="text-sm font-medium">{formatMoney(o.priceCents)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            </Step>
          </>
        ) : (
          <p className="flex items-center gap-2 px-1 text-sm text-ink/70">
            <DeliveryBadge kind="digital" compact /> Tu carrito es 100 % digital: no necesitas dirección.
          </p>
        )}

        <Step n={cart.requiresShipping ? 4 : 2} title="Pago">
          <div className="rounded-xl border border-dashed border-black/20 p-4 text-sm text-ink/70">
            <p className="font-medium text-ink">Modo demostración</p>
            <p className="mt-1">
              Aquí irá el formulario seguro de Stripe (tarjeta, Apple Pay, Google Pay, OXXO, SPEI). En esta demo no se cobra nada ni se piden datos de tarjeta.
            </p>
          </div>
        </Step>
      </div>

      <section className="mt-5 space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Productos</span><span>{formatMoney(cart.subtotalCents)}</span></div>
        <div className="flex justify-between"><span>Envío</span><span>{cart.requiresShipping ? formatMoney(shippingCents) : 'No aplica'}</span></div>
        <div className="flex justify-between border-t border-black/10 pt-2 text-base font-semibold"><span>Total</span><span>{formatMoney(totalCents)}</span></div>
      </section>

      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button onClick={pay} disabled={paying} className="mt-4 w-full rounded-xl bg-ink py-3.5 font-medium text-paper disabled:opacity-60">
        {paying ? 'Procesando…' : `Pagar ${formatMoney(totalCents)} (demo)`}
      </button>
    </main>
  );
}

function toOrderLine(l: import('@/lib/cart').CartLine) {
  return {
    variantId: l.variantId,
    productSlug: l.product.slug,
    title: l.product.title,
    variantName: l.variant.name,
    type: l.variant.type,
    qty: l.qty,
    unitCents: l.variant.priceCents,
    hue: l.product.hue,
  };
}

function groupDigitalBySeller(lines: import('@/lib/cart').CartLine[], sellersWithShipping: string[]) {
  const map = new Map<string, import('@/lib/cart').CartLine[]>();
  for (const l of lines) {
    if (sellersWithShipping.includes(l.seller.id)) continue;
    map.set(l.seller.id, [...(map.get(l.seller.id) ?? []), l]);
  }
  return [...map.values()].map((ls) => ({
    sellerId: ls[0].seller.id,
    sellerName: ls[0].seller.name,
    shippingCents: 0,
    lines: ls.map(toOrderLine),
  }));
}
