import { DeliveryBadge } from './DeliveryBadge';

export interface ProductCardData {
  slug: string;
  title: string;
  sellerName: string;
  priceCents: number;
  currency: string;
  deliveryMix: 'physical' | 'digital' | 'both';
  rating?: number;
  imageHue: number; // marcador de posición hasta tener fotos del CDN
}

export function formatMoney(cents: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
}

export function ProductCard({ p }: { p: ProductCardData }) {
  return (
    <a href={`/p/${p.slug}`} className="group block">
      <div
        className="relative aspect-[4/5] overflow-hidden rounded-2xl transition-transform duration-200 group-active:scale-[0.98]"
        style={{ background: `linear-gradient(160deg, hsl(${p.imageHue} 45% 88%), hsl(${p.imageHue} 35% 72%))` }}
      >
        <div className="absolute left-2 top-2">
          <DeliveryBadge kind={p.deliveryMix} />
        </div>
      </div>
      <div className="mt-2 space-y-0.5 px-0.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.title}</h3>
        <p className="text-xs text-ink/60">{p.sellerName}{p.rating ? ` · ★ ${p.rating.toFixed(1)}` : ''}</p>
        <p className="text-sm font-semibold">{formatMoney(p.priceCents, p.currency)}</p>
      </div>
    </a>
  );
}
