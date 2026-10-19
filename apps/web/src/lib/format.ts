export function formatMoney(cents: number, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(cents / 100);
}

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

const dayFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });

/** "Llega entre el 23 y 27 de oct." a partir de días hábiles. */
export function deliveryWindow(minDays: number, maxDays: number, from = new Date()) {
  const a = addBusinessDays(from, minDays);
  const b = addBusinessDays(from, maxDays);
  return `Llega entre el ${dayFmt.format(a)} y el ${dayFmt.format(b)}`;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}
