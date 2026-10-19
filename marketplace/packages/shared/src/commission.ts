/**
 * Reglas de dinero del marketplace. Todo en centavos enteros (nunca floats).
 *
 * Regla de negocio: la plataforma cobra el 15 % SOLO sobre el precio de los productos.
 * El envío se cobra aparte al comprador y va íntegro al vendedor (no paga comisión).
 */

export const DEFAULT_COMMISSION_BPS = 1500; // 15.00 % en puntos base

export type FulfillmentType = 'physical' | 'digital';

export interface CartLine {
  sellerId: string;
  variantId: string;
  fulfillmentType: FulfillmentType;
  unitPriceCents: number;
  quantity: number;
}

export interface SellerSplit {
  sellerId: string;
  itemsCents: number;
  shippingCents: number;
  commissionBps: number;
  commissionCents: number;
  /** Lo que se transfiere al vendedor: productos − comisión + envío. */
  sellerNetCents: number;
  hasPhysical: boolean;
  hasDigital: boolean;
}

export interface OrderSplit {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  platformFeeCents: number;
  requiresShipping: boolean;
  sellers: SellerSplit[];
}

function assertCents(n: number, label: string): void {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`${label} debe ser un entero de centavos >= 0 (recibido ${n})`);
  }
}

/** Comisión redondeada al centavo (medio hacia arriba) usando solo aritmética entera. */
export function commissionCents(itemsCents: number, bps: number = DEFAULT_COMMISSION_BPS): number {
  assertCents(itemsCents, 'itemsCents');
  if (!Number.isInteger(bps) || bps < 0 || bps > 10_000) throw new Error(`bps inválido: ${bps}`);
  return Math.floor((itemsCents * bps + 5_000) / 10_000);
}

/**
 * Divide un carrito mixto en sub-pedidos por vendedor y calcula la comisión de cada uno.
 * @param shippingBySeller costo de envío elegido por vendedor (solo vendedores con líneas físicas).
 * @param bpsBySeller comisión por vendedor si alguno tiene una tarifa negociada; por defecto 15 %.
 */
export function splitOrder(
  lines: CartLine[],
  shippingBySeller: Record<string, number> = {},
  bpsBySeller: Record<string, number> = {},
): OrderSplit {
  if (lines.length === 0) throw new Error('El carrito está vacío');

  const bySeller = new Map<string, CartLine[]>();
  for (const line of lines) {
    assertCents(line.unitPriceCents, 'unitPriceCents');
    if (!Number.isInteger(line.quantity) || line.quantity <= 0) throw new Error('quantity debe ser > 0');
    const group = bySeller.get(line.sellerId) ?? [];
    group.push(line);
    bySeller.set(line.sellerId, group);
  }

  const sellers: SellerSplit[] = [];
  for (const [sellerId, group] of bySeller) {
    const itemsCents = group.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
    const hasPhysical = group.some((l) => l.fulfillmentType === 'physical');
    const hasDigital = group.some((l) => l.fulfillmentType === 'digital');
    const shippingCents = hasPhysical ? (shippingBySeller[sellerId] ?? 0) : 0;
    assertCents(shippingCents, 'shippingCents');
    if (!hasPhysical && shippingBySeller[sellerId]) {
      throw new Error(`El vendedor ${sellerId} solo tiene productos digitales: no lleva envío`);
    }
    const commissionBps = bpsBySeller[sellerId] ?? DEFAULT_COMMISSION_BPS;
    const fee = commissionCents(itemsCents, commissionBps);
    sellers.push({
      sellerId,
      itemsCents,
      shippingCents,
      commissionBps,
      commissionCents: fee,
      sellerNetCents: itemsCents - fee + shippingCents,
      hasPhysical,
      hasDigital,
    });
  }

  const subtotalCents = sellers.reduce((s, x) => s + x.itemsCents, 0);
  const shippingCents = sellers.reduce((s, x) => s + x.shippingCents, 0);
  const platformFeeCents = sellers.reduce((s, x) => s + x.commissionCents, 0);

  return {
    subtotalCents,
    shippingCents,
    totalCents: subtotalCents + shippingCents,
    platformFeeCents,
    requiresShipping: sellers.some((s) => s.hasPhysical),
    sellers,
  };
}
