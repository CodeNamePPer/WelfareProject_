import { redirect } from "next/navigation";

// /payroll ไม่มีเนื้อหาของตัวเอง ส่งต่อไปเมนูแรกของการเงิน (ดีไซน์ F01)
export default function PayrollHome() {
  redirect("/payroll/approvals");
}
