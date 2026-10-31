import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { adminAlerts } from "@/data/mock";

export default function AdminNotificationsPage() {
  return <NotificationsPage initialAlerts={adminAlerts} />;
}
