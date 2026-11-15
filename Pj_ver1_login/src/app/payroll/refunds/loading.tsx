import { FinLoading } from "@/features/finance/FinLoading";

export default function Loading() {
  return <FinLoading title="เงินที่ต้องคืน" description="เงินเบิกล่วงหน้าที่พนักงานต้องคืนบริษัท" tiles={2} />;
}
