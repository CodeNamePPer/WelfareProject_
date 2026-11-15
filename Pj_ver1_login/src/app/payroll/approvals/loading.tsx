import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="รายการอนุมัติ / รอจ่าย" description="คำขอที่ HR อนุมัติแล้ว" tiles={4} tabs />;
}
