// ดึงข้อมูลฝั่ง server (ใช้ใน page.tsx เท่านั้น ห้าม import ใน client component)

import { connection } from "next/server";
import { listClaims } from "@/lib/claims/service";
import { FINANCE_STATUSES, toPaymentRequest } from "@/lib/claims/mappers";
import type { PaymentRequest } from "./types";

/** คำขอที่ถึงขั้นการเงินแล้ว: คำขอที่ HR ปฏิเสธโดยไม่เคยผ่านการเงินจะไม่แสดง */
export async function fetchPaymentRequests(): Promise<PaymentRequest[]> {
  // บอก Next.js ว่าข้อมูลนี้ต้องดึงใหม่ทุกครั้งที่มีคนเปิดหน้า (ไม่ build เก็บไว้ล่วงหน้า)
  await connection();
  const claims = await listClaims({ statuses: FINANCE_STATUSES });
  if (!claims) throw new Error("โหลดรายการคำขอไม่สำเร็จ");
  return claims
    .filter((claim) => claim.status !== "rejected" || claim.events.some((event) => event.kind === "hr_approved"))
    .map(toPaymentRequest);
}
