import { getAllUsersWithProfile, getOrgOptions } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/get-session";
import { getEmailDelivery } from "@/lib/email/resend";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import AdminUsersClient from "./AdminUsersClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ตั้งค่าผู้ใช้งานระบบ" };

// ?user=<รหัสพนักงาน> เปิดหน้าโดยเลือกผู้ใช้คนนั้นไว้ (เช่น ปุ่มแก้ไขจากหน้าโปรไฟล์)
export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ user?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const [users, orgOptions, { user: initialSelectedId }] = await Promise.all([
    getAllUsersWithProfile(),
    getOrgOptions(),
    searchParams,
  ]);

  return (
    <div className="flex flex-col gap-[24px]">
      <PageHeader title="ตั้งค่าผู้ใช้งานระบบ" description="จัดการบัญชี เช็คสถานะ และการเข้าใช้งาน" />
      <AdminUsersClient
        initialUsers={users}
        orgOptions={orgOptions}
        initialSelectedId={initialSelectedId}
        currentUserId={session.sub}
        emailDelivery={getEmailDelivery()}
      />
    </div>
  );
}
