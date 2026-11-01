import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { getAdminAlerts } from "@/lib/admin/alerts";

export default function AdminNotificationsPage() {
  return <NotificationsPage initialAlerts={getAdminAlerts()} />;
}
