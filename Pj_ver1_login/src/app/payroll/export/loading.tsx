import { ExportHeader } from "@/features/payroll/components/payroll/PageHeaders";
import { ExportSkeleton } from "@/features/payroll/components/payroll/PageSkeletons";

// แสดงทันทีที่กดเข้าหน้า "Export รายงาน (Excel)" ระหว่างที่ page.tsx ดึงข้อมูล
// หัวหน้าเป็นข้อความจริง ส่วนเนื้อหาเป็น skeleton ที่วางโครงเหมือนหน้าจริง
export default function Loading() {
  return (
    <>
      <ExportHeader />
      <ExportSkeleton />
    </>
  );
}
