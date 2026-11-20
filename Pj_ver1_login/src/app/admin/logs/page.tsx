import { LogClient } from "@/features/hr/LogClient";
import { HrPage } from "@/features/hr/ui";
import { LOG_SECTIONS, SECTIONS } from "@/features/logs/sections";
import { getAdminLogRows } from "@/lib/admin/logs";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ประวัติของระบบ" };

// อ่าน log ล่าสุดทุกครั้งที่เปิดหน้า
export const dynamic = "force-dynamic";

const TABS = [{ id: "all", label: "ทั้งหมด" }, ...LOG_SECTIONS.map((id) => ({ id, label: SECTIONS[id].label }))];

// ประวัติของระบบ (ดีไซน์ C แบบหน้าประวัติของ HR) · ?tab=people / welfare / system เปิดแท็บนั้นทันที
// หน้านี้แสดงรายการล่าสุด ส่วน Export ดึงทั้งหมดจาก /api/admin/logs/export
export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  return (
    <HrPage>
      <LogClient
        entries={await getAdminLogRows()}
        tabs={TABS}
        initialTab={LOG_SECTIONS.find((id) => id === tab) ?? "all"}
        title="ประวัติของระบบ"
        description="การกระทำทั้งหมดในระบบ ค่าก่อนและหลังแก้ไข · แก้ไขหรือลบไม่ได้"
        csvName="system-log.csv"
        exportUrl="/api/admin/logs/export"
      />
    </HrPage>
  );
}
