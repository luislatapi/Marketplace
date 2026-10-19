import { describe, expect, it } from 'vitest';
import { commissionCents, splitOrder } from './commission';

describe('commissionCents', () => {
  it('cobra 15 % redondeando al centavo', () => {
    expect(commissionCents(50_000)).toBe(7_500);
    expect(commissionCents(333)).toBe(50); // 49.95 → 50
    expect(commissionCents(0)).toBe(0);
  });

  it('rechaza importes no enteros', () => {
    expect(() => commissionCents(10.5)).toThrow();
  });
});

describe('splitOrder (ejemplo del documento)', () => {
  const split = splitOrder(
    [
      { sellerId: 'A', variantId: 'camiseta-m', fulfillmentType: 'physical', unitPriceCents: 50_000, quantity: 1 },
      { sellerId: 'B', variantId: 'ebook-pdf', fulfillmentType: 'digital', unitPriceCents: 20_000, quantity: 1 },
    ],
    { A: 9_900 },
  );

  it('cobra 799.00 en total', () => {
    expect(split.totalCents).toBe(79_900);
    expect(split.requiresShipping).toBe(true);
  });

  it('la plataforma se queda 105.00 (el envío no paga comisión)', () => {
    expect(split.platformFeeCents).toBe(10_500);
  });

  it('Tienda A recibe 425 + 99 de envío = 524.00 y Tienda B 170.00', () => {
    const a = split.sellers.find((s) => s.sellerId === 'A')!;
    const b = split.sellers.find((s) => s.sellerId === 'B')!;
    expect(a.sellerNetCents).toBe(52_400);
    expect(b.sellerNetCents).toBe(17_000);
    expect(b.shippingCents).toBe(0);
  });

  it('el dinero cuadra: comisión + netos = total cobrado', () => {
    const nets = split.sellers.reduce((s, x) => s + x.sellerNetCents, 0);
    expect(nets + split.platformFeeCents).toBe(split.totalCents);
  });
});

describe('splitOrder reglas', () => {
  it('un carrito solo digital no requiere envío', () => {
    const s = splitOrder([{ sellerId: 'B', variantId: 'x', fulfillmentType: 'digital', unitPriceCents: 1000, quantity: 2 }]);
    expect(s.requiresShipping).toBe(false);
    expect(s.totalCents).toBe(2000);
  });

  it('rechaza envío para un vendedor solo digital', () => {
    expect(() =>
      splitOrder([{ sellerId: 'B', variantId: 'x', fulfillmentType: 'digital', unitPriceCents: 1000, quantity: 1 }], { B: 500 }),
    ).toThrow();
  });

  it('respeta una comisión negociada por vendedor', () => {
    const s = splitOrder([{ sellerId: 'C', variantId: 'x', fulfillmentType: 'physical', unitPriceCents: 10_000, quantity: 1 }], {}, { C: 1000 });
    expect(s.platformFeeCents).toBe(1_000);
  });
});
