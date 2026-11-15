import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="เบิกล่วงหน้า / ค้างใบเสร็จ" description="ติดตามเงินที่จ่ายล่วงหน้าจนกว่าจะแนบใบเสร็จและปิดรายการ" tiles={4} tabs />;
}
