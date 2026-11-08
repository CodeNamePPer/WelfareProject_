import { PaySettingsHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { PaySettingsSkeleton } from "@/features/payroll/components/payroll/PageSkeletons";

// แสดงทันทีที่กดเข้าหน้า "ตั้งค่าการจ่ายเงิน" ระหว่างที่ page.tsx ดึงข้อมูล
// หัวหน้าเป็นข้อความจริง ส่วนเนื้อหาเป็น skeleton ที่วางโครงเหมือนหน้าจริง
export default function Loading() {
  return (
    <>
      <PaySettingsHeader />
      <PaySettingsSkeleton />
    </>
  );
}
