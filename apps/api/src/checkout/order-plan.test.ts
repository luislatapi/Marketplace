import { describe, expect, it } from 'vitest';
import { buildOrderPlan, PlanError, type PlanVariant } from './order-plan';

const seller = (id: string) => ({ id, storeName: `Tienda ${id}`, status: 'active', payoutsEnabled: true, commissionBps: 1500 });
const product = (id: string, sellerId: string) => ({ id, title: `Producto ${id}`, status: 'active', sellerId });

const camiseta: PlanVariant = {
  id: '11111111-1111-1111-1111-111111111111', sku: 'CAM-M', name: 'Talla M', fulfillmentType: 'physical', priceCents: 50_000, currency: 'MXN', isActive: true,
  product: product('cam', 'A'), seller: seller('A'), physical: { available: 3, weightGrams: 210 },
};
const ebook: PlanVariant = {
  id: '22222222-2222-2222-2222-222222222222', sku: 'PDF', name: 'PDF', fulfillmentType: 'digital', priceCents: 20_000, currency: 'MXN', isActive: true,
  product: product('ebook', 'B'), seller: seller('B'), physical: null,
};
const address = { name: 'Luis', phone: '5555555555', line1: 'Calle 1, Roma', city: 'CDMX', state: 'CDMX', postalCode: '06700', country: 'MX' };

describe('buildOrderPlan', () => {
  it('reproduce el ejemplo del documento: 799 cobrados, 105 de comisión', () => {
    const plan = buildOrderPlan([camiseta, ebook], { items: [{ variantId: camiseta.id, qty: 1 }, { variantId: ebook.id, qty: 1 }], shipping: {}, address });
    expect(plan.totalCents).toBe(79_900);
    expect(plan.platformFeeCents).toBe(10_500);
    expect(plan.sellers.find((s) => s.sellerId === 'A')!.sellerNetCents).toBe(52_400);
    expect(plan.sellers.find((s) => s.sellerId === 'B')!.shipping).toBeNull();
  });

  it('usa el precio del servidor y suma cantidades repetidas', () => {
    const plan = buildOrderPlan([camiseta], { items: [{ variantId: camiseta.id, qty: 1 }, { variantId: camiseta.id, qty: 1 }], shipping: {}, address });
    expect(plan.subtotalCents).toBe(100_000);
  });

  it('un digital siempre es licencia única', () => {
    const plan = buildOrderPlan([ebook], { items: [{ variantId: ebook.id, qty: 4 }], shipping: {} });
    expect(plan.totalCents).toBe(20_000);
    expect(plan.requiresShipping).toBe(false);
  });

  it('cobra el envío express elegido', () => {
    const plan = buildOrderPlan([camiseta], { items: [{ variantId: camiseta.id, qty: 1 }], shipping: { A: 'express' }, address });
    expect(plan.shippingCents).toBe(17_900);
    expect(plan.platformFeeCents).toBe(7_500); // el envío no paga comisión
  });

  it('rechaza más unidades que el stock disponible', () => {
    expect(() => buildOrderPlan([camiseta], { items: [{ variantId: camiseta.id, qty: 4 }], shipping: {}, address })).toThrow(PlanError);
  });

  it('pide dirección si hay físicos', () => {
    expect(() => buildOrderPlan([camiseta], { items: [{ variantId: camiseta.id, qty: 1 }], shipping: {} })).toThrow(/dirección/);
  });

  it('rechaza productos inactivos o desconocidos', () => {
    expect(() => buildOrderPlan([], { items: [{ variantId: camiseta.id, qty: 1 }], shipping: {} })).toThrow(PlanError);
    const off = { ...ebook, product: { ...ebook.product, status: 'in_review' } };
    expect(() => buildOrderPlan([off], { items: [{ variantId: ebook.id, qty: 1 }], shipping: {} })).toThrow(PlanError);
  });

  it('respeta una comisión negociada', () => {
    const vip = { ...ebook, seller: { ...ebook.seller, commissionBps: 1000 } };
    expect(buildOrderPlan([vip], { items: [{ variantId: ebook.id, qty: 1 }], shipping: {} }).platformFeeCents).toBe(2_000);
  });
});
