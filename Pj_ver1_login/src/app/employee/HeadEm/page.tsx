import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getSubordinates } from "@/lib/employee/subordinates";
import HeadEmClient from "./HeadEmClient";

// เข้าได้เฉพาะคนที่มีลูกน้องโดยตรงที่ยังทำงานอยู่ ไม่พึ่งการซ่อนเมนูอย่างเดียว
export default async function HeadEmPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const subordinates = await getSubordinates(session.sub);
  if (subordinates === null) {
    return <p className="text-13 text-status-rejected">โหลดรายชื่อพนักงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }
  if (subordinates.length === 0) {
    redirect("/access-denied?reason=role");
  }

  return <HeadEmClient employees={subordinates} />;
}
