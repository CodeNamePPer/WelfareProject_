/** ค่าที่ต้องให้ Excel อ่านเป็นข้อความ (เช่น เบอร์โทร 0812345678 ที่ Excel จะตัด 0 ข้างหน้าทิ้ง) */
export type CsvText = { readonly csvText: string };
export type CsvCell = string | number | CsvText;

/** ห่อค่าให้ Excel แสดงตามตัวอักษร ไม่แปลงเป็นตัวเลข */
export function csvText(value: string | null | undefined): CsvText | string {
  return value ? { csvText: value } : '';
}

/** ISO -> "2026-11-20 14:30" เวลาไทย (มีปี และ Excel อ่านเป็นวันเวลาได้) */
export function csvDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok', hour12: false }).slice(0, 16);
}

function quote(text: string): string {
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function escapeCell(value: CsvCell): string {
  if (typeof value === 'object') {
    // ="0812345678" ให้ Excel คงเลข 0 ข้างหน้า – ใช้กับค่าที่เป็นตัวเลข/ขีด/วงเล็บ/ช่องว่างเท่านั้น จึงไม่มีสูตรแฝงได้
    if (/^[0-9][0-9 ()-]*$/.test(value.csvText)) return quote(`="${value.csvText}"`);
    return escapeCell(value.csvText);
  }
  // กัน CSV formula injection: ข้อความที่ขึ้นต้นด้วย = + - @ tab หรือ CR ถูก Excel ตีความเป็นสูตร
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return quote(text);
}

/** True when the picked file is a .csv. Imports accept CSV only. */
export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

/** Builds a UTF-8 CSV (with BOM so spreadsheet apps show Thai correctly) and triggers a browser download. */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<CsvCell>>): void {
  const body = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');
  const blob = new Blob(['﻿', body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // บางเบราว์เซอร์ยังอ่าน blob ไม่ทันถ้าเพิกถอนทันทีหลัง click
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
