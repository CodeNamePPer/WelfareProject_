import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { listMyEditRequests } from "@/lib/hr/editRequests";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, editRequests] = await Promise.all([getMyProfile(session.sub), listMyEditRequests(session.sub, 1)]);
  if (!profile) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return <ProfileClient profile={profile} roleLabel={ROLE_LABELS[session.role] ?? session.role} editRequest={editRequests[0] ?? null} />;
}
