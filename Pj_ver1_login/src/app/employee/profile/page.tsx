import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await getMyProfile(session.sub);
  if (!profile) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return <ProfileClient profile={profile} />;
}
