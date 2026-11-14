import type { Metadata } from "next";
import type { ReactNode } from "react";

// หน้ารายงานเป็น client component จึงตั้งชื่อแท็บผ่าน layout
export const metadata: Metadata = { title: "รายงานและสถิติ" };

export default function ReportsLayout({ children }: { children: ReactNode }) {
  return children;
}
