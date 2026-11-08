import { RoundsHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { RoundsSkeleton } from "@/features/payroll/components/payroll/RoundsSkeleton";

// แสดงทันทีที่กดเข้าหน้า "ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย" ระหว่างที่ page.tsx ดึงข้อมูล
// หัวหน้าเป็นข้อความจริง ส่วนเนื้อหาเป็น skeleton ที่วางโครงเหมือนหน้าจริง
export default function Loading() {
  return (
    <>
      <RoundsHeader />
      <RoundsSkeleton />
    </>
  );
}
