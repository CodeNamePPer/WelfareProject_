import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="Export รายงาน (Excel)" description="เลือกช่วงข้อมูล ตรวจรายการที่จะส่งออก แล้วดาวน์โหลดเป็น .xlsx หรือ .csv" />;
}
