// ดึงข้อมูลฝั่ง server (ใช้ใน page.tsx เท่านั้น ห้าม import ใน client component)
// ตอนนี้อ่านจากข้อมูลตัวอย่าง + หน่วงเวลาจำลองการเรียก API เพื่อให้เห็นหน้า loading (skeleton)
// ตอนต่อ API จริง: แทนที่เนื้อหาใน fetchPaymentRequests() ด้วย fetch(...) แล้วลบการหน่วงเวลาออก

import { connection } from "next/server";
import { getPaymentRequests } from "./mock-data";
import type { PaymentRequest } from "./types";

/** เวลาที่จำลองว่า API ตอบกลับ (มิลลิวินาที) ตั้งเป็น 0 เพื่อปิด */
export const MOCK_LATENCY_MS = 800;

/** คำขอเบิกทั้งหมด (จำลองการเรียก API) */
export async function fetchPaymentRequests(): Promise<PaymentRequest[]> {
  // บอก Next.js ว่าข้อมูลนี้ต้องดึงใหม่ทุกครั้งที่มีคนเปิดหน้า (ไม่ build เก็บไว้ล่วงหน้า)
  // หน้า loading.tsx จึงแสดงระหว่างรอ
  await connection();
  if (MOCK_LATENCY_MS > 0) await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return getPaymentRequests();
}
