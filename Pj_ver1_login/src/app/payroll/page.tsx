import { redirect } from "next/navigation";

// /payroll ไม่มีเนื้อหาของตัวเอง ส่งต่อไปเมนูแรกของฝ่ายการเงิน
export default function PayrollHome() {
  redirect("/payroll/rounds");
}
