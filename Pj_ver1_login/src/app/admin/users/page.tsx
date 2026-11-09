import { getAllUsersWithProfile, getOrgOptions } from "@/lib/auth/users";
import { getSession } from "@/lib/auth/get-session";
import { getEmailDelivery } from "@/lib/email/resend";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ตั้งค่าผู้ใช้งานระบบ" };

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const [users, orgOptions] = await Promise.all([getAllUsersWithProfile(), getOrgOptions()]);

  return (
    <AdminUsersClient
      initialUsers={users}
      orgOptions={orgOptions}
      currentUserId={session.sub}
      emailDelivery={getEmailDelivery()}
    />
  );
}
