import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getSession } from "@/lib/auth/get-session";
import { getHrNotifications, type HrNotice, type HrNoticeTone } from "@/lib/hr/notifications";
import { Button, Card, HrPage, PageHeader } from "@/features/hr/ui";

export const metadata: Metadata = { title: "แจ้งเตือน" };
export const dynamic = "force-dynamic";

const TZ = "Asia/Bangkok";
const dayOf = (at: Date | string) => new Date(at).toLocaleDateString("sv-SE", { timeZone: TZ });

// สีวงไอคอนตามดีไซน์ H07
const TONE: Record<HrNoticeTone, { bg: string; ink: string }> = {
  amber: { bg: "bg-[#FEF3C7]", ink: "text-[#92400E]" },
  orange: { bg: "bg-[#FFEDD5]", ink: "text-[#9A3412]" },
  indigo: { bg: "bg-[#E0E7FF]", ink: "text-[#3730A3]" },
  green: { bg: "bg-[#DCFCE7]", ink: "text-[#166534]" },
  red: { bg: "bg-[#FEE2E2]", ink: "text-[#991B1B]" },
};

/** วันนี้แสดงเวลา วันอื่นแสดงวันที่ (ดีไซน์ H07) */
function whenOf(at: string, today: string) {
  const date = new Date(at);
  return dayOf(date) === today
    ? date.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ })
    : date.toLocaleDateString("th-TH", { day: "numeric", month: "short", timeZone: TZ });
}

// H07 แจ้งเตือน: สร้างจากข้อมูลจริง ยังไม่มีที่เก็บสถานะอ่านแล้ว ทุกรายการจึงแสดงเป็นยังไม่อ่าน
export default async function HrNotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const notices = await getHrNotifications(session.sub, session.role);
  if (!notices) return <p className="text-13 text-status-rejected-ink">โหลดแจ้งเตือนไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const today = dayOf(new Date());
  const weekAgo = dayOf(new Date(Date.now() - 6 * 86_400_000));
  const groups: { label: string; items: HrNotice[] }[] = [
    { label: "วันนี้", items: notices.filter((notice) => dayOf(notice.at) === today) },
    { label: "สัปดาห์นี้", items: notices.filter((notice) => dayOf(notice.at) < today && dayOf(notice.at) >= weekAgo) },
    { label: "ก่อนหน้านี้", items: notices.filter((notice) => dayOf(notice.at) < weekAgo) },
  ].filter((group) => group.items.length > 0);

  return (
    <HrPage>
      <PageHeader
        title="แจ้งเตือน"
        description={notices.length > 0 ? `ยังไม่ได้อ่าน ${notices.length} รายการ` : "ไม่มีรายการที่ยังไม่ได้อ่าน"}
        actions={
          <Button variant="quiet" className="!px-4" disabled title="ยังบันทึกสถานะอ่านแล้วไม่ได้ รอเปิดใช้ตารางสถานะการอ่าน">
            อ่านทั้งหมดแล้ว
          </Button>
        }
      />
      <Card className="overflow-hidden">
        {groups.length === 0 ? (
          <p className="px-5 py-10 text-center text-13 text-muted">ยังไม่มีแจ้งเตือน</p>
        ) : (
          groups.map((group, index) => (
            <div key={group.label}>
              <h2 className={`bg-[#F8FAFC] px-5 py-2.5 text-12 font-semibold text-muted ${index > 0 ? "border-t border-[#F1F5F9]" : ""}`}>{group.label}</h2>
              <ul className="m-0 list-none p-0">
                {group.items.map((notice) => (
                  <li key={notice.id}>
                    <Link
                      href={notice.href}
                      className="flex items-start gap-3.5 border-t border-[#F1F5F9] bg-[#F8FAFF] px-4 py-3.5 text-ink no-underline hover:bg-primary-50 focus-visible:bg-primary-50 focus-visible:outline-none sm:px-5"
                    >
                      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full ${TONE[notice.tone].bg}`}>
                        <Bell className={`size-4 ${TONE[notice.tone].ink}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold">{notice.title}</span>
                        <span className="block break-words text-13 text-ink-soft">{notice.body}</span>
                      </span>
                      <span className="text-12 whitespace-nowrap text-muted">{whenOf(notice.at, today)}</span>
                      <span role="img" aria-label="ยังไม่อ่าน" className="mt-1.5 size-2 shrink-0 rounded-full bg-[#1D4ED8]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Card>
    </HrPage>
  );
}
