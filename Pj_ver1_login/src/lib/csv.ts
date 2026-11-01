function escapeCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** True when the picked file is a .csv. Imports accept CSV only. */
export function isCsvFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv');
}

/** Builds a UTF-8 CSV (with BOM so spreadsheet apps show Thai correctly) and triggers a browser download. */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>): void {
  const body = [header, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
  const blob = new Blob(['﻿', body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
