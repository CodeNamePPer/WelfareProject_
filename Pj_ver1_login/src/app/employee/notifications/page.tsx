import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, CircleAlert, CircleCheck, CircleX, FileText, PencilLine, type LucideIcon } from "lucide-react";
import { getSession } from "@/lib/auth/get-session";
import { listClaims } from "@/lib/claims/service";
import { baht, bangkokToday, thaiDayMonth, thaiTime } from "@/lib/claims/requester";
import type { ClaimEventKind } from "@/lib/claims/types";
import { cx } from "@/lib/cx";
import { EmptyNote, PageHead, RowLink, Sheet } from "@/features/requester/ui";

export const metadata: Metadata = { title: "แจ้งเตือน" };

type Visual = { title: string; icon: LucideIcon; tone: string };

const VISUAL: Record<ClaimEventKind, Visual> = {
  submitted: { title: "ส่งคำขอแล้ว", icon: FileText, tone: "bg-status-pending-soft text-status-pending-ink" },
  resubmitted: { title: "ส่งคำขอที่แก้ไขแล้ว", icon: FileText, tone: "bg-status-pending-soft text-status-pending-ink" },
  revision_requested: { title: "HR ส่งคำขอกลับให้แก้ไข", icon: PencilLine, tone: "bg-orange-100 text-orange-800" },
  hr_approved: { title: "HR อนุมัติแล้ว ส่งต่อการเงิน", icon: CircleCheck, tone: "bg-status-approved-soft text-status-approved-ink" },
  finance_approved: { title: "การเงินอนุมัติจ่ายแล้ว", icon: CircleCheck, tone: "bg-status-approved-soft text-status-approved-ink" },
  amount_adjusted: { title: "ปรับยอดอนุมัติ", icon: CircleAlert, tone: "bg-status-pending-soft text-status-pending-ink" },
  returned: { title: "การเงินส่งกลับให้ HR ตรวจอีกครั้ง", icon: CircleAlert, tone: "bg-status-pending-soft text-status-pending-ink" },
  rejected: { title: "คำขอไม่ได้รับอนุมัติ", icon: CircleX, tone: "bg-status-rejected-soft text-status-rejected-ink" },
  cancelled: { title: "ยกเลิกคำขอแล้ว", icon: CircleX, tone: "bg-slate-100 text-slate-600" },
  pay_date_changed: { title: "การเงินเลื่อนวันจ่าย", icon: CircleAlert, tone: "bg-status-pending-soft text-status-pending-ink" },
  paid: { title: "โอนเงินแล้ว", icon: Banknote, tone: "bg-primary-100 text-primary-700" },
  payment_failed: { title: "โอนเงินไม่สำเร็จ", icon: CircleX, tone: "bg-status-rejected-soft text-status-rejected-ink" },
  payment_reversed: { title: "กลับรายการโอนเงิน", icon: CircleAlert, tone: "bg-status-rejected-soft text-status-rejected-ink" },
};

const GROUPS = ["วันนี้", "สัปดาห์นี้", "ก่อนหน้านี้"] as const;
const MAX_ITEMS = 60;

// แจ้งเตือนของผู้ส่งคำขอ สร้างจากประวัติการดำเนินการของคำขอ (welfare_claim_event)
// ยังไม่มีตารางเก็บสถานะอ่านแล้วของพนักงาน จึงไม่มีจุด "ยังไม่อ่าน" และปุ่ม "อ่านทั้งหมดแล้ว"
export default async function EmployeeNotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const claims = await listClaims({ employeeCode: session.sub });
  if (!claims) {
    return <p className="text-13 text-status-rejected">โหลดแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  const today = bangkokToday();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const items = claims
    .flatMap((claim) => claim.events.map((event, index) => ({ key: `${claim.id}-${index}`, claim, event })))
    .sort((a, b) => b.event.at.localeCompare(a.event.at))
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const day = new Date(item.event.at).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
      return { ...item, group: day === today ? GROUPS[0] : item.event.at >= weekAgo ? GROUPS[1] : GROUPS[2], time: day === today ? thaiTime(item.event.at) : thaiDayMonth(item.event.at) };
    });

  return (
    <>
      <PageHead title="แจ้งเตือน" description="ความเคลื่อนไหวของคำขอสวัสดิการของคุณ เรียงจากล่าสุด" />

      <Sheet className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyNote>ยังไม่มีแจ้งเตือน เมื่อยื่นคำขอแล้ว ความเคลื่อนไหวจะแสดงที่นี่</EmptyNote>
        ) : (
          GROUPS.map((group) => {
            const rows = items.filter((item) => item.group === group);
            if (rows.length === 0) return null;
            return (
              <section key={group} aria-label={group}>
                <h2 className="bg-surface px-5 py-2.5 text-12 font-semibold text-muted">{group}</h2>
                {rows.map(({ key, claim, event, time }) => {
                  const visual = VISUAL[event.kind];
                  const Icon = visual.icon;
                  return (
                    <RowLink key={key} href={`/employee/status?id=${encodeURIComponent(claim.claimNo)}`} className="!flex items-start gap-3.5 py-3.5">
                      <span aria-hidden="true" className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", visual.tone)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{visual.title}</span>
                        <span className="block text-13 text-ink-soft">
                          {claim.claimNo} {claim.benefitName} {baht(claim.amountRequested)}
                          {event.actorName && event.actorCode !== session.sub ? ` · โดย ${event.actorName}` : ""}
                          {event.note ? ` · ${event.note}` : ""}
                        </span>
                      </span>
                      <span className="text-12 whitespace-nowrap text-muted">{time}</span>
                    </RowLink>
                  );
                })}
              </section>
            );
          })
        )}
      </Sheet>
    </>
  );
}
