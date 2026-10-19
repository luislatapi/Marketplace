/**
 * Pedidos simulados guardados en el navegador (Fase 1 sin backend).
 * Reflejan la estructura real: un pedido, sub-pedidos por vendedor y una línea por variante.
 */
import type { FulfillmentType } from './catalog';

export interface OrderLine {
  variantId: string;
  productSlug: string;
  title: string;
  variantName: string;
  type: FulfillmentType;
  qty: number;
  unitCents: number;
  hue: number;
}

export interface SellerOrder {
  sellerId: string;
  sellerName: string;
  lines: OrderLine[];
  shippingCents: number;
  shippingLabel?: string;
  minDays?: number;
  maxDays?: number;
  trackingNumber?: string;
}

export interface Order {
  id: string;
  number: string;
  createdAt: string;
  email: string;
  address?: { name: string; line1: string; city: string; state: string; postalCode: string; phone: string };
  sellerOrders: SellerOrder[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

const KEY = 'mkt.orders.v1';

export function loadOrders(): Order[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Order[]) : [];
  } catch {
    return [];
  }
}

export function saveOrder(order: Order) {
  const all = [order, ...loadOrders()];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* sin almacenamiento */
  }
}

export function getOrder(id: string) {
  return loadOrders().find((o) => o.id === id);
}

export function newOrderIds() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const seq = String(Math.floor(Math.random() * 900_000) + 100_000);
  return { id: `ord_${rand}${Date.now().toString(36)}`, number: `MKT-${new Date().getFullYear()}-${seq}` };
}

/** Estado simulado del envío según el tiempo transcurrido desde la compra. */
export function shipmentStep(createdAt: string): 0 | 1 | 2 | 3 {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 36e5;
  if (hours < 0.05) return 0; // pagado
  if (hours < 24) return 1; // preparando
  if (hours < 72) return 2; // en camino
  return 3; // entregado
}

export const SHIPMENT_STEPS = ['Pagado', 'Preparando', 'En camino', 'Entregado'] as const;
