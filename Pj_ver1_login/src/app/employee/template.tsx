import type { ReactNode } from "react";

// สร้างใหม่ทุกครั้งที่เปลี่ยนหน้าในส่วนนี้: เนื้อหาหน้าใหม่ค่อยๆ ปรากฏ ไม่โผล่พรวด (ปิดเองเมื่อผู้ใช้ตั้งลดการเคลื่อนไหว)
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
