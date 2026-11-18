import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Banknote, CircleAlert, CircleCheck, CircleX, FileText, PencilLine, type LucideIcon } from "lucide-react";
import { getSession } from "@/lib/auth/get-session";
import { listClaims } from "@/lib/claims/service";
import { baht, bangkokToday, thaiDayMonth, thaiTime } from "@/lib/claims/requester";
import type { ClaimEventKind } from "@/lib/claims/types";
import { cx } from "@/lib/cx";
import { EmptyNote, PageHead, RowLink, Sheet } from "@/features/requester/ui";
import { getNotificationsSeenAt } from "@/lib/employee/notifications";
import { listMyEditRequests, type MyEditRequest } from "@/lib/hr/editRequests";
import { MarkAllSeen } from "./MarkAllSeen";

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
  receipt_submitted: { title: "แนบใบเสร็จจริงแล้ว", icon: FileText, tone: "bg-status-pending-soft text-status-pending-ink" },
  receipt_approved: { title: "ตรวจใบเสร็จจริงผ่านแล้ว", icon: CircleCheck, tone: "bg-status-approved-soft text-status-approved-ink" },
  receipt_returned: { title: "HR ส่งใบเสร็จจริงกลับให้แก้ไข", icon: PencilLine, tone: "bg-orange-100 text-orange-800" },
  advance_cancelled: { title: "ยกเลิกเบิกล่วงหน้าแล้ว", icon: CircleX, tone: "bg-slate-100 text-slate-600" },
  refund_received: { title: "รับเงินคืนส่วนต่างแล้ว", icon: CircleCheck, tone: "bg-status-approved-soft text-status-approved-ink" },
};

// คำขอแก้ไขข้อมูลส่วนตัว (employee_edit_request): ส่งแล้ว → HR อนุมัติ / ไม่อนุมัติ
const EDIT_VISUAL: Record<"submitted" | "approved" | "rejected", Visual> = {
  submitted: { title: "ส่งคำขอแก้ไขข้อมูลแล้ว", icon: FileText, tone: "bg-status-pending-soft text-status-pending-ink" },
  approved: { title: "HR อนุมัติคำขอแก้ไขข้อมูลแล้ว", icon: CircleCheck, tone: "bg-status-approved-soft text-status-approved-ink" },
  rejected: { title: "HR ไม่อนุมัติคำขอแก้ไขข้อมูล", icon: CircleX, tone: "bg-status-rejected-soft text-status-rejected-ink" },
};

type Item = { key: string; at: string; visual: Visual; body: string; href: string; mine: boolean };

function editRequestItems(request: MyEditRequest, viewerCode: string): Item[] {
  const what = `คำขอเปลี่ยน${request.labels.join(", ")}`;
  const items: Item[] = [{ key: `edit-${request.id}-submitted`, at: request.submittedAt, visual: EDIT_VISUAL.submitted, body: `${what} · รอ HR ตรวจสอบ`, href: "/employee/profile", mine: true }];
  if (request.status !== "pending" && request.decidedAt) {
    const by = request.deciderName ? ` · โดย ${request.deciderName}` : "";
    const body = request.status === "approved" ? `${what} บันทึกลงโปรไฟล์แล้ว${by}` : `${what}${by}${request.decisionNote ? ` · ${request.decisionNote}` : ""}`;
    items.push({ key: `edit-${request.id}-${request.status}`, at: request.decidedAt, visual: EDIT_VISUAL[request.status], body, href: "/employee/profile", mine: request.deciderCode === viewerCode });
  }
  return items;
}

const GROUPS = ["วันนี้", "สัปดาห์นี้", "ก่อนหน้านี้"] as const;
const MAX_ITEMS = 60;

// แจ้งเตือนของผู้ส่งคำขอ สร้างจากประวัติการดำเนินการของคำขอ (welfare_claim_event)
// สถานะอ่านแล้วเก็บเป็นเวลาที่อ่านล่าสุดต่อคน (employee_notification_seen) เหตุการณ์ที่ผู้ขอทำเองไม่นับเป็นยังไม่อ่าน
export default async function EmployeeNotificationsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [claims, seenAt, editRequests] = await Promise.all([listClaims({ employeeCode: session.sub }), getNotificationsSeenAt(session.sub), listMyEditRequests(session.sub)]);
  if (!claims) {
    return <p className="text-13 text-status-rejected">โหลดแจ้งเตือนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  const today = bangkokToday();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const claimItems: Item[] = claims.flatMap((claim) =>
    claim.events.map((event, index) => ({
      key: `${claim.id}-${index}`,
      at: event.at,
      visual: VISUAL[event.kind],
      body: `${claim.claimNo} ${claim.benefitName} ${baht(claim.amountRequested)}${event.actorName && event.actorCode !== session.sub ? ` · โดย ${event.actorName}` : ""}${event.note ? ` · ${event.note}` : ""}`,
      href: `/employee/status?id=${encodeURIComponent(claim.claimNo)}`,
      mine: event.actorCode === session.sub,
    })),
  );
  const items = [...claimItems, ...editRequests.flatMap((request) => editRequestItems(request, session.sub))]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, MAX_ITEMS)
    .map((item) => {
      const day = new Date(item.at).toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
      const unread = !item.mine && (!seenAt || item.at > seenAt);
      return { ...item, unread, group: day === today ? GROUPS[0] : item.at >= weekAgo ? GROUPS[1] : GROUPS[2], time: day === today ? thaiTime(item.at) : thaiDayMonth(item.at) };
    });

  const unreadCount = items.filter((item) => item.unread).length;

  return (
    <>
      <PageHead
        title="แจ้งเตือน"
        description={unreadCount > 0 ? `ยังไม่ได้อ่าน ${unreadCount} รายการ · ความเคลื่อนไหวของคำขอของคุณ เรียงจากล่าสุด` : "ความเคลื่อนไหวของคำขอของคุณ เรียงจากล่าสุด"}
      >
        <MarkAllSeen unread={unreadCount} />
      </PageHead>

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
                {rows.map(({ key, visual, body, href, time, unread }) => {
                  const Icon = visual.icon;
                  return (
                    <RowLink key={key} href={href} className="!flex items-start gap-3.5 py-3.5">
                      <span aria-hidden="true" className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", visual.tone)}>
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx("block", unread ? "font-semibold" : "font-medium")}>{visual.title}</span>
                        <span className="block text-13 text-ink-soft">{body}</span>
                      </span>
                      <span className="flex items-center gap-2 text-12 whitespace-nowrap text-muted">
                        {time}
                        {unread ? <span role="img" aria-label="ยังไม่อ่าน" className="size-2 shrink-0 rounded-full bg-[#1D4ED8]" /> : <span aria-hidden="true" className="size-2 shrink-0" />}
                      </span>
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
