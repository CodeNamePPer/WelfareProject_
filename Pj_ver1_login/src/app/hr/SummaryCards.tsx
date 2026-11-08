import Link from "next/link";
import { pendingRequests } from "./sample/pending";
import { approvedRequests } from "./sample/approved";
import { rejectedRequests } from "./sample/rejected";
import { revisionRequests } from "./sample/revision";

const count = new Intl.NumberFormat("th-TH");

// ตัวเลขนับจากรายการชุดเดียวกับตารางของแต่ละหน้า จึงตรงกับจำนวนแถวเสมอ
// ยอดเงินยังไม่มีแหล่งข้อมูล (ไม่มีตารางคำขอเบิก) จึงแสดง "—" แทนตัวเลขสมมติ
function buildSummary(pendingCount: number) {
  return [
    { id: "home", label: "คำขอรอตรวจ", value: count.format(pendingCount), unit: "รายการ", icon: "clock", tone: "", href: "/hr/home" },
    { id: "rejected", label: "ปฏิเสธแล้ว", value: count.format(rejectedRequests.length), unit: "รายการ", icon: "reject", tone: "", href: "/hr/home/rejected" },
    { id: "approved", label: "อนุมัติแล้ว", value: count.format(approvedRequests.length), unit: "รายการ", icon: "check", tone: "", href: "/hr/home/approved" },
    { id: "revision", label: "รอแก้ไข", value: count.format(revisionRequests.length), unit: "รายการ", icon: "edit", tone: "", href: "/hr/home/revision" },
    { id: "paid", label: "ยอดเบิกจ่ายเดือนนี้", value: "—", unit: "ยังไม่มีข้อมูล", icon: "wallet", tone: "dark" },
    { id: "budget", label: "งบประมาณคงเหลือ", value: "—", unit: "ยังไม่มีข้อมูล", icon: "chart", tone: "dark" },
  ];
}

function SummaryIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    reject: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    edit: <><circle cx="12" cy="12" r="9" /><path d="m8 16 1-3 6-6 2 2-6 6-3 1ZM14 8l2 2" /></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="2" /><path d="M3 9h18M16 15h2M7 6V4a2 2 0 0 1 2-2h10" /></>,
    chart: <><path d="M3 3v18h18M8 15l4-4 3 3 6-7" /><path d="M16 7h5v5" /></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

export function SummaryCards({
  active,
  pendingCount = pendingRequests.length,
}: {
  active?: "home" | "rejected" | "approved" | "revision";
  /** จำนวนที่ยังรอตรวจจริงบนหน้าจอ (ลดลงเมื่อ HR ดำเนินการแล้ว) */
  pendingCount?: number;
}) {
  return (
    <>
    <p className="sample-data-note" role="note">ข้อมูลคำขอเป็นข้อมูลตัวอย่าง ยังไม่ได้เชื่อมกับฐานข้อมูล</p>
    <section className="summary-grid" aria-label="สรุปภาพรวม">
      {buildSummary(pendingCount).map((item) => {
        const selected = active === item.id;
        const card = (
          <article className={`summary-card${item.tone ? ` ${item.tone}` : ""}${selected ? " selected" : ""}`}>
            <div className="summary-card-top">
              <h2>{item.label}</h2>
              <span className="summary-icon"><SummaryIcon name={item.icon} /></span>
            </div>
            <p className="summary-value">
              <strong>{item.value}</strong>
              <span>{item.unit}</span>
            </p>
          </article>
        );
        return item.href ? (
          <Link className="summary-card-link" href={item.href} key={item.id} aria-current={selected ? "page" : undefined}>
            {card}
          </Link>
        ) : (
          <div key={item.id}>{card}</div>
        );
      })}
    </section>
    </>
  );
}
