import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { listClaims } from "@/lib/claims/service";
import { HR_PENDING } from "@/features/hr/queue";
import { isHrHead } from "@/lib/hr/hrHead";

// แจ้งเตือนของ HR (ดีไซน์ H07) สร้างจากข้อมูลจริง ไม่มีตารางแจ้งเตือนแยก:
//   คำขอใหม่รอตรวจ · การเงินส่งคำขอกลับ · ผลข้อเสนอสวัสดิการ (ของผู้เสนอ) · ข้อเสนอรออนุมัติ (ของหัวหน้า HR)
// สถานะอ่านแล้วยังไม่มีที่เก็บ (รอ migration hr_notification_read) ทุกรายการจึงนับเป็นยังไม่อ่าน

export type HrNoticeTone = "amber" | "orange" | "indigo" | "green" | "red";

export type HrNotice = {
  id: string;
  /** ISO */
  at: string;
  title: string;
  body: string;
  href: string;
  tone: HrNoticeTone;
};

/** ผลข้อเสนอที่ตัดสินแล้วแสดงย้อนหลังกี่วัน */
const DECIDED_DAYS = 30;

type ProposalRow = {
  id: string;
  proposal_no: string;
  status: "pending" | "needs_info" | "approved" | "rejected";
  name_th: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  benefit: { name_th: string } | null;
  proposer: { employee_code: string; first_name_th: string; last_name_th: string } | null;
};

const PROPOSAL_SELECT =
  "id, proposal_no, status, name_th, submitted_at, decided_at, benefit:benefit_id(name_th), proposer:proposed_by!inner(employee_code, first_name_th, last_name_th)";

const DECIDED: Record<"needs_info" | "approved" | "rejected", { title: string; tone: HrNoticeTone }> = {
  needs_info: { title: "หัวหน้า HR ขอข้อมูลเพิ่ม", tone: "orange" },
  approved: { title: "หัวหน้า HR อนุมัติข้อเสนอแล้ว", tone: "green" },
  rejected: { title: "หัวหน้า HR ไม่อนุมัติข้อเสนอ", tone: "red" },
};

const proposalLabel = (row: ProposalRow) => `ข้อเสนอ ${row.proposal_no} ${row.name_th ?? row.benefit?.name_th ?? ""}`.trim();

/** แจ้งเตือนของผู้ที่ล็อกอินอยู่ ใหม่สุดก่อน (null = โหลดไม่สำเร็จ) */
export const getHrNotifications = cache(async (viewerCode: string, role: string): Promise<HrNotice[] | null> => {
  try {
    const head = await isHrHead({ sub: viewerCode, role });
    const since = new Date(Date.now() - DECIDED_DAYS * 86_400_000).toISOString();
    const [claims, mine, waiting] = await Promise.all([
      listClaims({ statuses: HR_PENDING }),
      supabaseAdmin
        .from("welfare_benefit_proposal")
        .select(PROPOSAL_SELECT)
        .eq("proposer.employee_code", viewerCode)
        .in("status", ["needs_info", "approved", "rejected"])
        .gte("decided_at", since)
        .is("deleted_at", null)
        .returns<ProposalRow[]>(),
      head
        ? supabaseAdmin.from("welfare_benefit_proposal").select(PROPOSAL_SELECT).eq("status", "pending").is("deleted_at", null).returns<ProposalRow[]>()
        : Promise.resolve({ data: [] as ProposalRow[], error: null }),
    ]);
    if (!claims) throw new Error("claims not loaded");
    if (mine.error) throw mine.error;
    if (waiting.error) throw waiting.error;

    const notices: HrNotice[] = [];
    for (const claim of claims) {
      // คำขอของตัวเองตรวจเองไม่ได้ จึงไม่แจ้ง
      if (claim.employeeCode === viewerCode) continue;
      const href = `/hr/home/requests/${encodeURIComponent(claim.claimNo)}`;
      if (claim.status === "finance_returned") {
        const returned = [...claim.events].reverse().find((event) => event.kind === "returned");
        notices.push({
          id: `claim-returned-${claim.id}`,
          at: returned?.at ?? claim.submittedAt ?? claim.createdAt,
          title: "การเงินส่งคำขอกลับ",
          body: [claim.claimNo, returned?.note].filter(Boolean).join(" "),
          href,
          tone: "indigo",
        });
      } else {
        const proxy = claim.submittedByCode !== claim.employeeCode ? ` (ยื่นแทนโดย ${claim.submittedByName})` : "";
        notices.push({
          id: `claim-new-${claim.id}`,
          at: claim.submittedAt ?? claim.createdAt,
          title: "คำขอใหม่รอตรวจ",
          body: `${claim.claimNo} ${claim.benefitName} ${claim.employeeName}${proxy}`,
          href,
          tone: "amber",
        });
      }
    }
    for (const row of mine.data ?? []) {
      if (row.status === "pending") continue;
      notices.push({ id: `proposal-${row.status}-${row.id}`, at: row.decided_at ?? row.submitted_at ?? since, title: DECIDED[row.status].title, body: proposalLabel(row), href: `/hr/benefits/proposals/${row.id}`, tone: DECIDED[row.status].tone });
    }
    for (const row of waiting.data ?? []) {
      // ผู้เสนออนุมัติข้อเสนอของตัวเองไม่ได้
      if (row.proposer?.employee_code === viewerCode) continue;
      const by = row.proposer ? ` จาก ${row.proposer.first_name_th} ${row.proposer.last_name_th === "-" ? "" : row.proposer.last_name_th}`.trimEnd() : "";
      notices.push({ id: `proposal-pending-${row.id}`, at: row.submitted_at ?? since, title: "ข้อเสนอสวัสดิการใหม่รออนุมัติ", body: `${proposalLabel(row)}${by}`, href: `/hr/proposals/${row.id}`, tone: "amber" });
    }
    return notices.sort((a, b) => b.at.localeCompare(a.at));
  } catch (err) {
    console.error("[hr notifications] load failed", err);
    return null;
  }
});

/** ตัวเลขบนเมนูแจ้งเตือน โหลดไม่ได้คืน 0 */
export async function countHrNotifications(viewerCode: string, role: string): Promise<number> {
  return (await getHrNotifications(viewerCode, role))?.length ?? 0;
}
