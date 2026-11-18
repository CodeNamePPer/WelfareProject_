import { redirect } from "next/navigation";

// คำขอเบิกของ HR (HH4) รวมเข้าคิวคำขอหน้าแรกแล้ว · ลิงก์เดิมพาไปหน้าแรก
export default function HrClaimsPage() {
  redirect("/hr/home");
}
