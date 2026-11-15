import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import { getMyPendingEditRequest } from "@/lib/hr/editRequests";
import ChangeProfileClient from "./ChangeProfileClient";

export default async function ChangeProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [profile, pending] = await Promise.all([getMyProfile(session.sub), getMyPendingEditRequest(session.sub)]);
  if (!profile) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return <ChangeProfileClient profile={profile} pending={pending} />;
}
