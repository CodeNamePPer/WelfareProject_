// ส่งออกข้อมูลเป็นไฟล์ที่เปิดด้วย Excel ได้ (CSV แบบ UTF-8 มี BOM ทำให้ภาษาไทยไม่เพี้ยน)
// ไม่ต้องติดตั้งไลบรารีเพิ่ม ถ้าภายหลังต้องการไฟล์ .xlsx จริง (หลายชีต/จัดรูปแบบ) ค่อยเปลี่ยนไปใช้ exceljs

export interface ExportColumn<T> {
  header: string; // หัวคอลัมน์ใน Excel
  value: (row: T) => string | number; // ดึงค่าจากแต่ละแถว
}

/** ใส่เครื่องหมายคำพูดครอบค่าที่มี , " หรือขึ้นบรรทัดใหม่ ตามกติกา CSV */
function escapeCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** สร้างข้อความ CSV จากแถวข้อมูล (แยกออกมาเพื่อทดสอบได้ง่าย) */
export function toCsv<T>(columns: ExportColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => escapeCell(c.value(r))).join(","));
  return [header, ...body].join("\r\n");
}

/** สร้างไฟล์แล้วสั่งให้ browser ดาวน์โหลด (เรียกได้เฉพาะฝั่ง client เช่นใน onClick) */
export function downloadExcel<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const csv = "﻿" + toCsv(columns, rows); // ﻿ = BOM บอก Excel ว่าเป็น UTF-8
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
