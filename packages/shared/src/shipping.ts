/**
 * Cotización de envío por vendedor (tarifa plana por peso mientras no se conecta el agregador de paqueterías).
 * El envío se cobra aparte y va íntegro al vendedor: no paga comisión.
 */
export type ShippingOptionId = 'standard' | 'express';

export interface ShippingOption {
  id: ShippingOptionId;
  label: string;
  priceCents: number;
  minDays: number;
  maxDays: number;
}

export function quoteShipping(totalWeightGrams: number): ShippingOption[] {
  if (!Number.isFinite(totalWeightGrams) || totalWeightGrams < 0) throw new Error('Peso inválido');
  const extraKg = Math.max(0, Math.ceil(totalWeightGrams / 1000) - 1);
  const base = 9_900 + extraKg * 2_000;
  return [
    { id: 'standard', label: 'Estándar', priceCents: base, minDays: 3, maxDays: 5 },
    { id: 'express', label: 'Express', priceCents: base + 8_000, minDays: 1, maxDays: 2 },
  ];
}
