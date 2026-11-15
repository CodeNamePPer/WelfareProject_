import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="ดูข้อมูลย้อนหลัง" description="รอบจ่ายที่ปิดแล้ว · กดดูรายการในรอบ" tiles={3} />;
}
