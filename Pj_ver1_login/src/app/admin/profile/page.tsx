import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getUserWithProfileById } from "@/lib/auth/users";
import { getMyProfile } from "@/lib/employee/profile";
import { getEmployeeBenefits } from "@/lib/claims/service";
import { getPrimaryBankAccount } from "@/lib/hr/bankAccount";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfilePage } from "@/features/profile/ProfilePage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

// โปรไฟล์ของผู้ที่เข้าระบบอยู่ – อ่านใหม่ทุกครั้งให้ตรงกับที่แก้ในหน้าตั้งค่าผู้ใช้งาน
export const dynamic = "force-dynamic";

async function fetchRecentLogins(employeeCode: string) {
  const { data } = await supabaseAdmin
    .from("audit_logs")
    .select("created_at, ip_address")
    .eq("action", "LOGIN_SUCCESS")
    .eq("user_id", employeeCode)
    .order("created_at", { ascending: false })
    .limit(3);
  return (data ?? []).map((row) => ({
    at: row.created_at as string,
    ip: (row.ip_address as string | null) ?? null,
  }));
}

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [user, myProfile, benefits, bankAccount, recentLogins] = await Promise.all([
    getUserWithProfileById(session.sub),
    getMyProfile(session.sub).catch(() => null),
    getEmployeeBenefits(session.sub).catch(() => null),
    getPrimaryBankAccount(session.sub).catch(() => null),
    fetchRecentLogins(session.sub).catch(() => []),
  ]);

  return (
    <ProfilePage
      user={user}
      fallbackName={session.name}
      lastEdit={myProfile?.lastEdit ?? null}
      benefits={benefits}
      bankAccount={bankAccount}
      recentLogins={recentLogins}
    />
  );
}
