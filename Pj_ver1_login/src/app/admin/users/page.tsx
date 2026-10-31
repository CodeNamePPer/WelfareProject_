import { getAllUsersWithProfile, getOrgOptions } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const [users, orgOptions] = await Promise.all([getAllUsersWithProfile(), getOrgOptions()]);

  return (
    <div className="flex flex-col gap-[24px]">
      <PageHeader title="ตั้งค่าผู้ใช้งานระบบ" description="จัดการบัญชี เช็คสถานะ และการเข้าใช้งาน" />
      <AdminUsersClient initialUsers={users} orgOptions={orgOptions} />
    </div>
  );
}
