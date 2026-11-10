import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits } from "@/lib/claims/service";
import WelfareClient from "./WelfareClient";

export default async function WelfarePage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const benefits = await getEmployeeBenefits(session.sub);
    if (!benefits) {
        return <p className="text-13 text-status-rejected">โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
    }

    return <WelfareClient benefits={benefits} />;
}
