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

// แสดงวันที่ตามเวลาไทยเสมอ: server (UTC) กับเบราว์เซอร์ต้องได้วันเดียวกัน ไม่งั้นช่วง 00:00–06:59 น. คลาดไป 1 วันและ hydrate ไม่ตรง
const TZ = 'Asia/Bangkok';
const toDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso);

/** 2026-10-27 (or a date-time) -> 27 ต.ค. 69 */
export function formatShortThaiDate(iso: string): string {
  const date = toDate(iso);
  const year = Number(date.toLocaleDateString('en-CA', { timeZone: TZ, year: 'numeric' }));
  const thaiYear = String(year + 543).slice(-2);
  return `${date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: TZ })} ${thaiYear}`;
}

/** 2026-10-27 -> 27 ต.ค. 2569 */
export function formatThaiDate(iso: string): string {
  return toDate(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: TZ,
  });
}
