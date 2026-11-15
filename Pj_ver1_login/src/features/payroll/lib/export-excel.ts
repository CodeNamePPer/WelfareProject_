// ส่งออกข้อมูลเป็นไฟล์ให้ผู้ใช้ดาวน์โหลด (เรียกได้เฉพาะฝั่ง client เช่นใน onClick)
//   .csv  = UTF-8 มี BOM ทำให้ภาษาไทยไม่เพี้ยนเมื่อเปิดใน Excel และใช้อัปโหลดผลการโอนกลับได้
//   .xlsx = ไฟล์ Excel จริง (write-excel-file) หัวตารางตัวหนา ตัวเลขเป็นตัวเลข

export interface ExportColumn<T> {
  header: string; // หัวคอลัมน์
  value: (row: T) => string | number; // ดึงค่าจากแต่ละแถว
}

export type ExportFormat = "csv" | "xlsx";
export type ExportCell = string | number;

/** ใส่เครื่องหมายคำพูดครอบค่าที่มี , " หรือขึ้นบรรทัดใหม่ ตามกติกา CSV */
function escapeCell(v: ExportCell): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** สร้างข้อความ CSV จากหัวตารางและแถว */
export function tableToCsv(headers: string[], rows: ExportCell[][]): string {
  return [headers, ...rows].map((cells) => cells.map(escapeCell).join(",")).join("\r\n");
}

/** สร้างข้อความ CSV จากแถวข้อมูลและคอลัมน์ */
export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  return tableToCsv(
    columns.map((c) => c.header),
    rows.map((r) => columns.map((c) => c.value(r))),
  );
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ดาวน์โหลดตารางเป็น .csv หรือ .xlsx (ชื่อไฟล์ไม่ต้องใส่นามสกุล) */
export async function downloadTable(fileName: string, headers: string[], rows: ExportCell[][], format: ExportFormat) {
  const base = fileName.replace(/\.(csv|xlsx)$/i, "");
  if (format === "csv") {
    save(new Blob(["﻿" + tableToCsv(headers, rows)], { type: "text/csv;charset=utf-8" }), `${base}.csv`);
    return;
  }
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const widths = headers.map((header, index) => Math.min(40, Math.max(10, header.length + 2, ...rows.map((row) => String(row[index] ?? "").length + 2))));
  const blob = await writeExcelFile([headers.map((value) => ({ value, fontWeight: "bold" as const })), ...rows], { columns: widths.map((width) => ({ width })) }).toBlob();
  save(blob, `${base}.xlsx`);
}

/** ดาวน์โหลดแถวข้อมูลเป็น .csv (ไฟล์ธนาคารใช้แบบนี้ เพื่ออัปโหลดผลการโอนกลับได้) */
export function downloadExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  void downloadTable(
    filename,
    columns.map((c) => c.header),
    rows.map((r) => columns.map((c) => c.value(r))),
    "csv",
  );
}
