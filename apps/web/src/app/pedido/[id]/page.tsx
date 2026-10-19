'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DeliveryBadge } from '@/components/DeliveryBadge';
import { ProductArt } from '@/components/ProductArt';
import { ShipmentTimeline } from '@/components/ShipmentTimeline';
import { deliveryWindow, formatMoney } from '@/lib/format';
import { getOrder, shipmentStep, type Order } from '@/lib/orders';

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => setOrder(getOrder(id) ?? null), [id]);

  if (order === undefined) return <main className="mx-auto max-w-2xl px-4" aria-busy="true" />;
  if (order === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 pt-16 text-center">
        <p>No encontramos ese pedido en este dispositivo.</p>
        <Link href="/cuenta" className="mt-4 inline-block underline">Ir a mi cuenta</Link>
      </main>
    );
  }

  const digital = order.sellerOrders.flatMap((so) => so.lines.filter((l) => l.type === 'digital'));
  const shipping = order.sellerOrders.filter((so) => so.lines.some((l) => l.type === 'physical'));

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6">
      <div className="animate-rise">
        <p className="text-sm text-ink/60">Pedido {order.number}</p>
        <h1 className="mt-1 font-display text-2xl">¡Gracias! Tu pago está confirmado.</h1>
        <p className="mt-1 text-sm text-ink/70">Enviamos el recibo a {order.email}.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {digital.length > 0 && (
          <section className="animate-rise rounded-2xl bg-digital-soft p-4">
            <DeliveryBadge kind="digital" />
            <h2 className="mt-2 font-medium">Ya puedes descargar</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {digital.map((l) => (
                <li key={l.variantId}>· {l.title} <span className="text-ink/60">({l.variantName})</span></li>
              ))}
            </ul>
            <Link href="/cuenta?tab=biblioteca" className="mt-4 block rounded-xl bg-digital py-2.5 text-center text-sm font-medium text-white">
              Ir a mi biblioteca
            </Link>
          </section>
        )}

        {shipping.map((so) => (
          <section key={so.sellerId} className="animate-rise rounded-2xl bg-physical-soft p-4">
            <DeliveryBadge kind="physical" />
            <h2 className="mt-2 font-medium">{so.sellerName} está preparando tu envío</h2>
            <p className="text-sm text-ink/70">
              {so.shippingLabel} · {deliveryWindow(so.minDays ?? 3, so.maxDays ?? 5, new Date(order.createdAt))}
            </p>
            <ShipmentTimeline step={shipmentStep(order.createdAt)} />
            <div className="mt-3 flex -space-x-2">
              {so.lines.filter((l) => l.type === 'physical').map((l) => (
                <ProductArt key={l.variantId} hue={l.hue} className="h-10 w-10 rounded-lg ring-2 ring-physical-soft" label={l.title} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-6 space-y-1.5 text-sm">
        <div className="flex justify-between"><span>Productos</span><span>{formatMoney(order.subtotalCents)}</span></div>
        <div className="flex justify-between"><span>Envío</span><span>{order.shippingCents ? formatMoney(order.shippingCents) : 'No aplica'}</span></div>
        <div className="flex justify-between border-t border-black/10 pt-2 font-semibold"><span>Total pagado</span><span>{formatMoney(order.totalCents)}</span></div>
      </section>

      <Link href="/" className="mt-6 block text-center text-sm underline">Seguir explorando</Link>
    </main>
  );
}
