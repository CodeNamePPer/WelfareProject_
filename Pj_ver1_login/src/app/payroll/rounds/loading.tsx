import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย" description="ค่าจาก system_setting.pay_schedule · ผู้ส่งคำขอเห็นวันจ่ายชุดเดียวกันนี้" />;
}
