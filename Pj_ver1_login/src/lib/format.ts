const baht = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBaht(value: number): string {
  return `฿${baht.format(value)}`;
}

/** 2026-10-27 -> 27 ต.ค. 2569 */
export function formatThaiDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
