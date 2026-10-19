/** Datos del panel de vendedor (demo). La comisión es 15 % sobre productos; el envío va íntegro al vendedor. */
export const COMMISSION_BPS = 1500;

export function commissionCents(itemsCents: number) {
  return Math.floor((itemsCents * COMMISSION_BPS + 5_000) / 10_000);
}

export interface DraftProduct {
  id: string;
  title: string;
  mode: 'physical' | 'digital' | 'both';
  priceCents: number;
  digitalPriceCents?: number;
  createdAt: string;
  status: 'in_review';
}

const KEY = 'mkt.seller.drafts.v1';

export function loadDrafts(): DraftProduct[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveDraft(d: DraftProduct) {
  try {
    localStorage.setItem(KEY, JSON.stringify([d, ...loadDrafts()]));
  } catch {
    /* sin almacenamiento */
  }
}

/** Ventas diarias de muestra de los últimos 14 días (centavos de productos y envío). */
export const DEMO_DAILY = [
  [182_000, 19_800], [96_000, 9_900], [241_000, 29_700], [154_000, 19_800], [88_000, 0], [312_000, 39_600], [276_000, 29_700],
  [133_000, 9_900], [205_000, 19_800], [167_000, 19_800], [298_000, 29_700], [121_000, 9_900], [344_000, 49_500], [259_000, 29_700],
] as const;

export const DEMO_STATS = { visits: 4_812, orders: 96, pendingPayoutCents: 412_350 };
