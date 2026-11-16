import { redirect } from "next/navigation";
import { AdminNotices } from "@/features/admin/AdminNotices";
import { HrPage } from "@/features/hr/ui";
import { getAdminAlerts } from "@/lib/admin/alerts";
import { getSession } from "@/lib/auth/get-session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "แจ้งเตือน" };

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

// แจ้งเตือนของ Admin ในดีไซน์ C เดียวกับหน้าแจ้งเตือนของ HR (H07)
export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <HrPage>
      <AdminNotices initialAlerts={await getAdminAlerts(session.sub)} />
    </HrPage>
  );
}
