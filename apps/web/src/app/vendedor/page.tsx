'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { ProductArt } from '@/components/ProductArt';
import { deliveryMix, minPrice, PRODUCTS, SELLERS } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
import { commissionCents, DEMO_DAILY, DEMO_STATS, loadDrafts, type DraftProduct } from '@/lib/seller';

const SELLER_ID = 'estudio-orden';

export default function SellerDashboard() {
  const seller = SELLERS[SELLER_ID];
  const [drafts, setDrafts] = useState<DraftProduct[]>([]);
  useEffect(() => setDrafts(loadDrafts()), []);

  const items = DEMO_DAILY.reduce((s, d) => s + d[0], 0);
  const shipping = DEMO_DAILY.reduce((s, d) => s + d[1], 0);
  const fee = commissionCents(items);
  const net = items - fee + shipping;
  const peak = Math.max(...DEMO_DAILY.map((d) => d[0]));
  const products = PRODUCTS.filter((p) => p.sellerId === SELLER_ID);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-ink/60">Panel de vendedor · demo</p>
          <h1 className="font-display text-2xl">{seller.name}</h1>
        </div>
        <Link href="/vendedor/nuevo" className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-paper">+ Nuevo producto</Link>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Indicadores de los últimos 14 días">
        <Kpi label="Ventas de productos" value={formatMoney(items)} />
        <Kpi label="Tu ganancia neta" value={formatMoney(net)} hint={`Tras 15 % de comisión (${formatMoney(fee)}) + envíos`} strong />
        <Kpi label="Conversión" value={`${((DEMO_STATS.orders / DEMO_STATS.visits) * 100).toFixed(1)} %`} hint={`${DEMO_STATS.orders} pedidos de ${DEMO_STATS.visits.toLocaleString('es-MX')} visitas`} />
        <Kpi label="Saldo por liberar" value={formatMoney(DEMO_STATS.pendingPayoutCents)} hint="Se transfiere tras la ventana de devolución" />
      </section>

      <section className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <h2 className="font-medium">Ventas diarias · últimos 14 días</h2>
        <div className="mt-4 flex h-36 items-end gap-1.5" role="img" aria-label="Gráfica de barras de ventas diarias">
          {DEMO_DAILY.map(([cents], i) => (
            <div key={i} className="group relative flex-1">
              <div className="rounded-t-md bg-ink/80 transition-colors group-hover:bg-ink" style={{ height: `${(cents / peak) * 128}px` }} />
              <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-1.5 py-0.5 text-[10px] text-paper group-hover:block">
                {formatMoney(cents)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink/50">
          <span>hace 14 días</span>
          <span>hoy</span>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-black/5 pt-3 text-sm">
          <div><dt className="text-xs text-ink/60">Productos</dt><dd>{formatMoney(items)}</dd></div>
          <div><dt className="text-xs text-ink/60">Comisión 15 %</dt><dd>− {formatMoney(fee)}</dd></div>
          <div><dt className="text-xs text-ink/60">Envíos (100 % tuyos)</dt><dd>+ {formatMoney(shipping)}</dd></div>
        </dl>
      </section>

      <section className="mt-5">
        <h2 className="font-medium">Tus productos</h2>
        <ul className="mt-3 divide-y divide-black/5 rounded-2xl bg-white ring-1 ring-black/5">
          {drafts.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-3">
              <ProductArt hue={330} className="h-14 w-12 shrink-0 rounded-lg" label={d.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{d.title}</p>
                <p className="text-xs text-ink/60">{formatMoney(d.priceCents)}</p>
              </div>
              <DeliveryBadge kind={d.mode} compact />
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">En revisión</span>
            </li>
          ))}
          {products.map((p) => (
            <li key={p.slug} className="flex items-center gap-3 p-3">
              <ProductArt hue={p.hue} className="h-14 w-12 shrink-0 rounded-lg" label={p.title} />
              <div className="min-w-0 flex-1">
                <Link href={`/p/${p.slug}`} className="block truncate text-sm font-medium hover:underline">{p.title}</Link>
                <p className="text-xs text-ink/60">desde {formatMoney(minPrice(p))} · {p.variants.length} {p.variants.length === 1 ? 'variante' : 'variantes'}</p>
              </div>
              <DeliveryBadge kind={deliveryMix(p)} compact />
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">Activo</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Kpi({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ring-1 ${strong ? 'bg-ink text-paper ring-ink' : 'bg-white ring-black/5'}`}>
      <p className={`text-xs ${strong ? 'text-paper/70' : 'text-ink/60'}`}>{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className={`mt-1 text-[11px] leading-snug ${strong ? 'text-paper/70' : 'text-ink/50'}`}>{hint}</p>}
    </div>
  );
}
