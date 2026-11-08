import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getUserWithProfileById } from "@/lib/auth/users";
import { ProfilePage } from "@/features/profile/ProfilePage";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

// โปรไฟล์ของผู้ที่เข้าระบบอยู่ – อ่านใหม่ทุกครั้งให้ตรงกับที่แก้ในหน้าตั้งค่าผู้ใช้งาน
export const dynamic = "force-dynamic";

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await getUserWithProfileById(session.sub);
  return <ProfilePage user={user} fallbackName={session.name} />;
}
