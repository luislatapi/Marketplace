import Link from 'next/link';
import { deliveryMix, minPrice, SELLERS, type Product } from '@/lib/catalog';
import { formatMoney } from '@/lib/format';
import { DeliveryBadge } from './DeliveryBadge';
import { ProductArt } from './ProductArt';

export function ProductCard({ p }: { p: Product }) {
  const several = new Set(p.variants.map((v) => v.priceCents)).size > 1;
  return (
    <Link href={`/p/${p.slug}`} className="group block">
      <div className="relative">
        <ProductArt hue={p.hue} label={p.title} className="aspect-[4/5] rounded-2xl transition-transform duration-200 group-active:scale-[0.98]" />
        <div className="absolute left-2 top-2">
          <DeliveryBadge kind={deliveryMix(p)} />
        </div>
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
        <p className="text-xs text-ink/60">
          {SELLERS[p.sellerId].name} · ★ {p.rating.toFixed(1)}
        </p>
        <p className="text-sm font-semibold">
          {several && <span className="font-normal text-ink/60">desde </span>}
          {formatMoney(minPrice(p))}
        </p>
      </div>
    </Link>
  );
}
