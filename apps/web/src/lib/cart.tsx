'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findVariant, type Product, type Seller, type Variant } from './catalog';
import { quoteShipping } from './shipping';

export interface CartItem {
  variantId: string;
  qty: number;
}

export interface CartLine {
  variantId: string;
  qty: number;
  product: Product;
  variant: Variant;
  seller: Seller;
  lineCents: number;
}

export interface SellerShipment {
  seller: Seller;
  lines: CartLine[];
  weightGrams: number;
  options: ReturnType<typeof quoteShipping>;
}

interface CartContextValue {
  items: CartItem[];
  ready: boolean;
  count: number;
  lines: CartLine[];
  physicalBySeller: SellerShipment[];
  digitalLines: CartLine[];
  subtotalCents: number;
  requiresShipping: boolean;
  add: (variantId: string, qty?: number) => void;
  setQty: (variantId: string, qty: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const KEY = 'mkt.cart.v1';

function load(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return parsed.filter((i) => findVariant(i.variantId) && i.qty > 0);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible: el carrito vive solo en memoria */
    }
  }, [items, ready]);

  const add = useCallback((variantId: string, qty = 1) => {
    setItems((prev) => {
      const found = findVariant(variantId);
      if (!found) return prev;
      // Un producto digital se compra una sola vez: no tiene cantidad.
      const max = found.variant.type === 'digital' ? 1 : (found.variant.stock ?? 99);
      const existing = prev.find((i) => i.variantId === variantId);
      if (existing) {
        return prev.map((i) => (i.variantId === variantId ? { ...i, qty: Math.min(max, i.qty + qty) } : i));
      }
      return [...prev, { variantId, qty: Math.min(max, qty) }];
    });
  }, []);

  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) =>
      qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)),
    );
  }, []);

  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const lines: CartLine[] = items.flatMap((i) => {
      const f = findVariant(i.variantId);
      return f ? [{ ...i, ...f, lineCents: f.variant.priceCents * i.qty }] : [];
    });

    const bySeller = new Map<string, CartLine[]>();
    for (const l of lines.filter((l) => l.variant.type === 'physical')) {
      bySeller.set(l.seller.id, [...(bySeller.get(l.seller.id) ?? []), l]);
    }
    const physicalBySeller: SellerShipment[] = [...bySeller.values()].map((sl) => {
      const weightGrams = sl.reduce((s, l) => s + (l.variant.weightGrams ?? 0) * l.qty, 0);
      return { seller: sl[0].seller, lines: sl, weightGrams, options: quoteShipping(weightGrams) };
    });

    return {
      items,
      ready,
      count: items.reduce((s, i) => s + i.qty, 0),
      lines,
      physicalBySeller,
      digitalLines: lines.filter((l) => l.variant.type === 'digital'),
      subtotalCents: lines.reduce((s, l) => s + l.lineCents, 0),
      requiresShipping: physicalBySeller.length > 0,
      add,
      setQty,
      remove,
      clear,
    };
  }, [items, ready, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart debe usarse dentro de CartProvider');
  return ctx;
}
