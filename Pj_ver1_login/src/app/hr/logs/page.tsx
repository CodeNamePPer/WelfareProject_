import type { Metadata } from "next";
import { getHrLog } from "@/lib/hr/logs";
import { HrPage } from "@/features/hr/ui";
import { LogClient } from "./LogClient";

export const metadata: Metadata = { title: "ประวัติการแก้ไข" };
export const dynamic = "force-dynamic";

// H08 ประวัติการแก้ไข (Log): อ่านอย่างเดียว
export default async function HrLogPage() {
  const entries = await getHrLog();
  if (!entries) return <p className="text-13 text-status-rejected-ink">โหลดประวัติไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  return (
    <HrPage>
      <LogClient entries={entries} />
    </HrPage>
  );
}
