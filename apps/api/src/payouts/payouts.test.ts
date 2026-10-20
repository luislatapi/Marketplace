import { describe, expect, it } from 'vitest';
import { payoutReady } from './payouts.service';

const hold = { digital: 7, physical: 7 };
const now = new Date('2026-11-20T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe('payoutReady', () => {
  it('digital: espera 7 días desde el pago', () => {
    const c = { paidAt: daysAgo(3), items: [{ fulfillmentType: 'digital' as const, status: 'delivered' }], shipments: [], openDisputes: 0 };
    expect(payoutReady(c, hold, now)).toBe(false);
    expect(payoutReady({ ...c, paidAt: daysAgo(8) }, hold, now)).toBe(true);
  });

  it('físico: no paga hasta que se entrega y pasa la ventana de devolución', () => {
    const shipped = { paidAt: daysAgo(20), items: [{ fulfillmentType: 'physical' as const, status: 'shipped' }], shipments: [{ deliveredAt: null }], openDisputes: 0 };
    expect(payoutReady(shipped, hold, now)).toBe(false);
    const recent = { ...shipped, items: [{ fulfillmentType: 'physical' as const, status: 'delivered' }], shipments: [{ deliveredAt: daysAgo(2) }] };
    expect(payoutReady(recent, hold, now)).toBe(false);
    expect(payoutReady({ ...recent, shipments: [{ deliveredAt: daysAgo(9) }] }, hold, now)).toBe(true);
  });

  it('una disputa abierta bloquea la transferencia', () => {
    const c = { paidAt: daysAgo(30), items: [{ fulfillmentType: 'digital' as const, status: 'delivered' }], shipments: [], openDisputes: 1 };
    expect(payoutReady(c, hold, now)).toBe(false);
  });

  it('pedido sin pagar nunca se transfiere', () => {
    expect(payoutReady({ paidAt: null, items: [], shipments: [], openDisputes: 0 }, hold, now)).toBe(false);
  });
});
