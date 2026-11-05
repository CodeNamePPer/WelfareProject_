import { redirect } from "next/navigation";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { getAdminAlerts } from "@/lib/admin/alerts";
import { getSession } from "@/lib/auth/get-session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "การแจ้งเตือน" };

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return <NotificationsPage initialAlerts={await getAdminAlerts(session.sub)} />;
}
