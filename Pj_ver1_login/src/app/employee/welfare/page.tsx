import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits } from "@/lib/claims/service";
import { getMyProfile } from "@/lib/employee/profile";
import WelfareClient from "./WelfareClient";

export default async function WelfarePage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const [benefits, profile] = await Promise.all([getEmployeeBenefits(session.sub), getMyProfile(session.sub)]);
    if (!benefits) {
        return <p className="text-13 text-status-rejected">โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
    }

    // ตาม R02: สิทธิ์ขึ้นกับตำแหน่งและระดับงาน
    const role = profile?.position ? `ตามตำแหน่ง ${profile.position}${profile.jobLevel ? ` (${profile.jobLevel})` : ""}` : "";
    return <WelfareClient benefits={benefits} roleNote={role} />;
}
