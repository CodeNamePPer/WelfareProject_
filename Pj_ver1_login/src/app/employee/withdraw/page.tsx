import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import WithdrawClient from "./WithdrawClient";

export default async function WithdrawPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const profile = await getMyProfile(session.sub);
  if (!profile) {
    return <p className="text-13 text-status-rejected">โหลดข้อมูลพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return (
    <WithdrawClient
      applicant={{ employeeId: profile.code, fullName: profile.name, department: profile.department ?? "—" }}
    />
  );
}
