import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { listPendingEditRequests } from "@/lib/hr/editRequests";
import { EmptyState, Card, HrPage, PageHeader } from "@/features/hr/ui";
import { RequestCard } from "./RequestCard";

export const metadata: Metadata = { title: "คำขอแก้ไขข้อมูลพนักงาน" };
export const dynamic = "force-dynamic";

// H12 คำขอแก้ไขข้อมูลพนักงาน: พนักงานขอแก้ข้อมูลส่วนตัว HR ตรวจก่อนบันทึกจริง (ตาราง employee_edit_request)
export default async function EmployeeEditRequestsPage() {
  const [session, requests] = await Promise.all([getSession(), listPendingEditRequests()]);

  return (
    <HrPage>
      <PageHeader
        crumbs={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "คำขอแก้ไขข้อมูล" }]}
        title="คำขอแก้ไขข้อมูลพนักงาน"
        description="พนักงานขอแก้ข้อมูลส่วนตัว HR ตรวจก่อนบันทึกจริง"
      />
      {requests === null ? (
        <p className="text-13 text-status-rejected-ink">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState>ไม่มีคำขอแก้ไขข้อมูลที่รอตรวจ</EmptyState>
        </Card>
      ) : (
        requests.map((request) => <RequestCard key={request.id} request={request} own={request.employeeCode === session?.sub} />)
      )}
    </HrPage>
  );
}
