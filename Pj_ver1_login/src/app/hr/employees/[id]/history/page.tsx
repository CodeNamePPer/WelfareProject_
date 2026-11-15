import { redirect } from "next/navigation";

// หน้าประวัติรุ่นเก่าใช้ข้อมูลตัวอย่าง ประวัติคำขอรวมอยู่ในหน้ารายละเอียดพนักงาน ส่วนประวัติการแก้ไขอยู่ที่ /hr/logs
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/hr/employees/${encodeURIComponent(id)}`);
}
