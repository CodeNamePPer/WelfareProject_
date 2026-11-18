import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { listEditRequestHistory, listPendingEditRequests } from "@/lib/hr/editRequests";
import { HrPage, PageHeader } from "@/features/hr/ui";
import { EditRequestsTabs } from "./EditRequestsTabs";

export const metadata: Metadata = { title: "คำขอแก้ไขข้อมูลพนักงาน" };
export const dynamic = "force-dynamic";

// H12 คำขอแก้ไขข้อมูลพนักงาน: พนักงานขอแก้ข้อมูลส่วนตัว HR ตรวจก่อนบันทึกจริง (ตาราง employee_edit_request)
export default async function EmployeeEditRequestsPage() {
  const [session, requests, history] = await Promise.all([getSession(), listPendingEditRequests(), listEditRequestHistory()]);

  return (
    <HrPage>
      <PageHeader
        title="คำขอแก้ไขข้อมูลพนักงาน"
        description="พนักงานขอแก้ข้อมูลส่วนตัว HR ตรวจก่อนบันทึกจริง"
      />
      <EditRequestsTabs requests={requests} history={history} viewerCode={session?.sub ?? ""} />
    </HrPage>
  );
}
