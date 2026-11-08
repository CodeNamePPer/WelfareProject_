import Link from "next/link";
import type { HrStatusCounts } from "@/lib/claims/types";

type Status = "home" | "revision" | "rejected" | "approved";

const count = new Intl.NumberFormat("th-TH");

/**
 * แถบสถานะคำขอบรรทัดเดียว ใช้แทนการ์ดสรุป 6 ใบ
 * ตัวเลขนับจากรายการชุดเดียวกับตารางของแต่ละหน้า จึงตรงกับจำนวนแถวเสมอ
 * ส่ง query ของตัวกรองต่อไปด้วย ตัวกรองจึงคงอยู่เมื่อสลับแท็บ
 */
export function StatusTabs({
  active,
  counts,
  query = "",
}: {
  active: Status;
  counts: HrStatusCounts;
  /** "?q=...&dept=..." ของตัวกรองปัจจุบัน */
  query?: string;
}) {
  const tabs: { id: Status; label: string; value: number; href: string }[] = [
    { id: "home", label: "รอตรวจ", value: counts.pending, href: "/hr/home" },
    { id: "revision", label: "รอพนักงานแก้ไข", value: counts.revision, href: "/hr/home/revision" },
    { id: "rejected", label: "ปฏิเสธแล้ว", value: counts.rejected, href: "/hr/home/rejected" },
    { id: "approved", label: "อนุมัติแล้ว", value: counts.approved, href: "/hr/home/approved" },
  ];

  return (
    <div className="status-tabs-wrap">
      <nav className="status-tabs" aria-label="สถานะคำขอ">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`${tab.href}${query}`}
            className={`status-tab${tab.id === active ? " active" : ""}`}
            aria-current={tab.id === active ? "page" : undefined}
          >
            {tab.label}
            <span className="status-tab-count">
              <span className="sr-only"> </span>
              {count.format(tab.value)}
              <span className="sr-only"> รายการ</span>
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
