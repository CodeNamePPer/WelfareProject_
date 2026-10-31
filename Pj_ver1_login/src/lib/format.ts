const baht = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBaht(value: number): string {
  return `฿${baht.format(value)}`;
}

const bahtWhole = new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 });

/** 6000 -> ฿6,000 (table cells, where satang are never used) */
export function formatBahtWhole(value: number): string {
  return `฿${bahtWhole.format(value)}`;
}

/** 2026-10-27 (or a date-time) -> 27 ต.ค. 69 */
export function formatShortThaiDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  const thaiYear = String(date.getFullYear() + 543).slice(-2);
  return `${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${thaiYear}`;
}

/** 2026-10-27 -> 27 ต.ค. 2569 */
export function formatThaiDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
