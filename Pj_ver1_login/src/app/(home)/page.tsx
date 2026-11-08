import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // ผู้ดูแลระบบ ส่งต่อไปยังหน้าแผงควบคุม Admin
  if (session.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  // ฝ่ายบุคคล ส่งต่อไปยังหน้าของ HR
  if (session.role === "HR") {
    redirect("/hr");
  }

  // ฝ่ายการเงิน ส่งต่อไปยังหน้า Payroll
  if (session.role === "FINANCE") {
    redirect("/payroll");
  }

  redirect("/employee");
}
