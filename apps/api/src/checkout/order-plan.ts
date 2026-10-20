import { quoteShipping, splitOrder, type CheckoutInput, type ShippingOption } from '@mkt/shared';

/** Variante tal como sale de la base de datos, con lo mínimo para armar el pedido. */
export interface PlanVariant {
  id: string;
  sku: string;
  name: string | null;
  fulfillmentType: 'physical' | 'digital';
  priceCents: number;
  currency: string;
  isActive: boolean;
  product: { id: string; title: string; status: string; sellerId: string };
  seller: { id: string; storeName: string; status: string; payoutsEnabled: boolean; commissionBps: number };
  physical?: { available: number; weightGrams: number } | null;
}

export class PlanError extends Error {}

export interface OrderPlan {
  currency: string;
  requiresShipping: boolean;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  platformFeeCents: number;
  sellers: Array<{
    sellerId: string;
    storeName: string;
    itemsCents: number;
    shippingCents: number;
    shipping: ShippingOption | null;
    commissionBps: number;
    commissionCents: number;
    sellerNetCents: number;
    lines: Array<{ variant: PlanVariant; qty: number; lineTotalCents: number; title: string }>;
  }>;
}

/**
 * Valida el carrito contra los datos reales (precio, stock, estado) y calcula
 * sub-pedidos por vendedor. Precios siempre del servidor, nunca del cliente.
 */
export function buildOrderPlan(variants: PlanVariant[], input: Pick<CheckoutInput, 'items' | 'shipping' | 'address'>): OrderPlan {
  const byId = new Map(variants.map((v) => [v.id, v]));
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.variantId, (merged.get(it.variantId) ?? 0) + it.qty);

  const lines = [...merged].map(([variantId, qty]) => {
    const v = byId.get(variantId);
    if (!v || !v.isActive || v.product.status !== 'active') throw new PlanError('Un producto del carrito ya no está disponible');
    if (v.seller.status === 'suspended') throw new PlanError(`La tienda ${v.seller.storeName} no está vendiendo por ahora`);
    if (v.fulfillmentType === 'digital' && qty !== 1) qty = 1; // licencia única
    if (v.fulfillmentType === 'physical' && (v.physical?.available ?? 0) < qty) {
      throw new PlanError(`Solo quedan ${Math.max(0, v.physical?.available ?? 0)} de «${v.product.title}»`);
    }
    return { v, qty };
  });

  const currencies = new Set(lines.map((l) => l.v.currency));
  if (currencies.size > 1) throw new PlanError('No se pueden mezclar monedas en un pedido');

  // Envío por vendedor según su peso y la opción elegida.
  const shippingChoice: Record<string, ShippingOption> = {};
  const weight = new Map<string, number>();
  for (const l of lines) {
    if (l.v.fulfillmentType === 'physical') weight.set(l.v.seller.id, (weight.get(l.v.seller.id) ?? 0) + (l.v.physical?.weightGrams ?? 0) * l.qty);
  }
  for (const [sellerId, grams] of weight) {
    const opts = quoteShipping(grams);
    shippingChoice[sellerId] = opts.find((o) => o.id === (input.shipping?.[sellerId] ?? 'standard')) ?? opts[0];
  }
  if (weight.size > 0 && !input.address) throw new PlanError('Falta la dirección de envío');

  const split = splitOrder(
    lines.map((l) => ({ sellerId: l.v.seller.id, variantId: l.v.id, fulfillmentType: l.v.fulfillmentType, unitPriceCents: l.v.priceCents, quantity: l.qty })),
    Object.fromEntries(Object.entries(shippingChoice).map(([k, o]) => [k, o.priceCents])),
    Object.fromEntries(lines.map((l) => [l.v.seller.id, l.v.seller.commissionBps])),
  );

  return {
    currency: [...currencies][0],
    requiresShipping: split.requiresShipping,
    subtotalCents: split.subtotalCents,
    shippingCents: split.shippingCents,
    totalCents: split.totalCents,
    platformFeeCents: split.platformFeeCents,
    sellers: split.sellers.map((s) => ({
      sellerId: s.sellerId,
      storeName: lines.find((l) => l.v.seller.id === s.sellerId)!.v.seller.storeName,
      itemsCents: s.itemsCents,
      shippingCents: s.shippingCents,
      shipping: shippingChoice[s.sellerId] ?? null,
      commissionBps: s.commissionBps,
      commissionCents: s.commissionCents,
      sellerNetCents: s.sellerNetCents,
      lines: lines
        .filter((l) => l.v.seller.id === s.sellerId)
        .map((l) => ({ variant: l.v, qty: l.qty, lineTotalCents: l.v.priceCents * l.qty, title: l.v.name ? `${l.v.product.title} · ${l.v.name}` : l.v.product.title })),
    })),
  };
}
