import { getAllUsers } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const users = await getAllUsers();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">จัดการผู้ใช้งานระบบ</h1>
          <p className="mt-1 text-sm text-muted">
            แก้ไขข้อมูลพนักงาน กำหนดสิทธิ์ และสถานะการใช้งาน (สำหรับ Super Admin)
          </p>
        </div>

        {session && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{session.name}</p>
              <span className="inline-block rounded bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                {session.role}
              </span>
            </div>
          </div>
        )}
      </header>

      <AdminUsersClient initialUsers={users} />
    </div>
  );
}
