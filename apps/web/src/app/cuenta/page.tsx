'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { ProductArt } from '@/components/ProductArt';
import { ShipmentTimeline } from '@/components/ShipmentTimeline';
import { findVariant } from '@/lib/catalog';
import { formatDate, formatMoney } from '@/lib/format';
import { loadOrders, shipmentStep, type Order } from '@/lib/orders';

const DL_KEY = 'mkt.downloads.v1';

function loadDownloads(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DL_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function AccountPage() {
  const [tab, setTab] = useState<'pedidos' | 'biblioteca'>('pedidos');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [downloads, setDownloads] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setOrders(loadOrders());
    setDownloads(loadDownloads());
    if (new URLSearchParams(window.location.search).get('tab') === 'biblioteca') setTab('biblioteca');
  }, []);

  if (orders === null) return <main className="mx-auto max-w-3xl px-4" aria-busy="true" />;

  // Biblioteca: un derecho de acceso (entitlement) por cada línea digital comprada.
  const library = orders.flatMap((o) =>
    o.sellerOrders.flatMap((so) =>
      so.lines
        .filter((l) => l.type === 'digital')
        .map((l) => ({ key: `${o.id}:${l.variantId}`, order: o, line: l, seller: so.sellerName, spec: findVariant(l.variantId)?.variant })),
    ),
  );

  function download(key: string, max: number | null | undefined, title: string) {
    const used = downloads[key] ?? 0;
    if (max && used >= max) return;
    const next = { ...downloads, [key]: used + 1 };
    setDownloads(next);
    try {
      localStorage.setItem(DL_KEY, JSON.stringify(next));
    } catch {
      /* sin almacenamiento */
    }
    setToast(`«${title}»: en producción aquí se genera un enlace firmado que caduca en 10 minutos.`);
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6">
      <h1 className="font-display text-2xl">Mi cuenta</h1>

      <div role="tablist" className="mt-4 inline-flex rounded-full bg-white p-1 ring-1 ring-black/10">
        {(
          [
            ['pedidos', `Pedidos (${orders.length})`],
            ['biblioteca', `Biblioteca (${library.length})`],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`rounded-full px-4 py-1.5 text-sm ${tab === id ? 'bg-ink text-paper' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'pedidos' && (
        <div className="mt-5 space-y-4">
          {orders.length === 0 && <Empty text="Aún no tienes pedidos." />}
          {orders.map((o) => {
            const physical = o.sellerOrders.filter((so) => so.lines.some((l) => l.type === 'physical'));
            const digitalCount = o.sellerOrders.flatMap((so) => so.lines).filter((l) => l.type === 'digital').length;
            return (
              <article key={o.id} className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/pedido/${o.id}`} className="font-medium underline-offset-4 hover:underline">{o.number}</Link>
                  <span className="text-sm font-semibold">{formatMoney(o.totalCents)}</span>
                </div>
                <p className="text-xs text-ink/60">{formatDate(o.createdAt)}</p>

                {physical.map((so) => (
                  <div key={so.sellerId} className="mt-3 rounded-xl bg-paper p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">{so.sellerName}</span>
                      <DeliveryBadge kind="physical" compact />
                    </div>
                    <p className="text-xs text-ink/60">Guía {so.trackingNumber}</p>
                    <ShipmentTimeline step={shipmentStep(o.createdAt)} />
                  </div>
                ))}
                {digitalCount > 0 && (
                  <button onClick={() => setTab('biblioteca')} className="mt-3 flex items-center gap-2 text-sm text-digital">
                    <DeliveryBadge kind="digital" compact /> {digitalCount} {digitalCount === 1 ? 'producto digital entregado' : 'productos digitales entregados'} →
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {tab === 'biblioteca' && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {library.length === 0 && <Empty text="Tus compras digitales aparecerán aquí." />}
          {library.map(({ key, order, line, seller, spec }) => {
            const used = downloads[key] ?? 0;
            const max = spec?.maxDownloads ?? null;
            const exhausted = max !== null && used >= max;
            return (
              <article key={key} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-black/5">
                <ProductArt hue={line.hue} className="h-24 w-20 shrink-0 rounded-lg" label={line.title} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{line.title}</p>
                  <p className="text-xs text-ink/60">{line.variantName} · {seller}</p>
                  <p className="mt-1 text-xs text-ink/60">
                    {spec?.format ?? 'Archivo'} · {max === null ? 'Descargas ilimitadas' : `${max - used} de ${max} descargas`} · desde {formatDate(order.createdAt)}
                  </p>
                  <button
                    onClick={() => download(key, max, line.title)}
                    disabled={exhausted}
                    className="mt-2 rounded-lg bg-digital px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
                  >
                    {exhausted ? 'Límite alcanzado' : spec?.format?.includes('Streaming') ? 'Abrir curso' : 'Descargar'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {toast && (
        <div role="status" className="animate-rise fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md rounded-xl bg-ink px-4 py-3 text-sm text-paper shadow-lg sm:bottom-8">
          {toast}
        </div>
      )}
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-ink/60">
      {text}
      <Link href="/" className="mt-3 block underline">Explorar productos</Link>
    </div>
  );
}
