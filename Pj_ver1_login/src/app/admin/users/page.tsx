import { getSession } from "@/lib/auth/get-session";
import { getAllUsers } from "@/lib/auth/users";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const users = await getAllUsers();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-mist pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">จัดการผู้ใช้งานระบบ</h1>
          <p className="mt-1 text-ink-mute">แก้ไขข้อมูลพนักงาน กำหนดสิทธิ์ และสถานะการใช้งาน (สำหรับ Super Admin)</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-ink">{session.name}</p>
            <span className="inline-block rounded bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-soft">
              {session.role}
            </span>
          </div>
          <LogoutButton />
        </div>
      </header>

      <AdminUsersClient initialUsers={users} />
    </main>
  );
}
