import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { listClaims } from "@/lib/claims/service";
import { HR_PENDING } from "@/features/hr/queue";
import { isHrHead } from "@/lib/hr/hrHead";
import { findEmployeeUuidByCode } from "@/lib/auth/users";
import { listPendingEditRequests } from "@/lib/hr/editRequests";

// แจ้งเตือนของ HR (ดีไซน์ H07) สร้างจากข้อมูลจริง ไม่มีตารางแจ้งเตือนแยก:
//   คำขอใหม่รอตรวจ · การเงินส่งคำขอกลับ · คำขอแก้ไขข้อมูลพนักงาน · ผลข้อเสนอสวัสดิการ (ของผู้เสนอ) · ข้อเสนอรออนุมัติ (ของหัวหน้า HR)
// สถานะอ่านแล้วเก็บในตาราง hr_notification_read ตาม key ของแต่ละรายการ (key มีเวลาของเหตุการณ์ต่อท้าย
// เพื่อให้เหตุการณ์ใหม่ของคำขอหรือข้อเสนอเดิม เช่น ยื่นใหม่หลังแก้ไข กลับมาเป็นยังไม่อ่าน)

export type HrNoticeTone = "amber" | "orange" | "indigo" | "green" | "red";

export type HrNotice = {
  id: string;
  /** ISO */
  at: string;
  title: string;
  body: string;
  href: string;
  tone: HrNoticeTone;
  read: boolean;
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
    const [claims, edits, mine, waiting] = await Promise.all([
      listClaims({ statuses: HR_PENDING }),
      listPendingEditRequests(),
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
    const readKeys = await getReadKeys(viewerCode);
    if (mine.error) throw mine.error;
    if (waiting.error) throw waiting.error;

    const notices: Omit<HrNotice, "read">[] = [];
    for (const claim of claims) {
      // คำขอของตัวเองตรวจเองไม่ได้ จึงไม่แจ้ง
      if (claim.employeeCode === viewerCode) continue;
      const href = `/hr/home/requests/${encodeURIComponent(claim.claimNo)}`;
      if (claim.status === "finance_returned") {
        const returned = [...claim.events].reverse().find((event) => event.kind === "returned");
        notices.push({
          id: `claim-returned-${claim.id}-${returned?.at ?? ""}`,
          at: returned?.at ?? claim.submittedAt ?? claim.createdAt,
          title: "การเงินส่งคำขอกลับ",
          body: [claim.claimNo, returned?.note].filter(Boolean).join(" "),
          href,
          tone: "indigo",
        });
      } else {
        const lastAt = claim.events.at(-1)?.at ?? claim.submittedAt ?? claim.createdAt;
        const proxy = claim.submittedByCode !== claim.employeeCode ? ` (ยื่นแทนโดย ${claim.submittedByName})` : "";
        notices.push({
          id: `claim-new-${claim.id}-${lastAt}`,
          at: claim.submittedAt ?? claim.createdAt,
          title: "คำขอใหม่รอตรวจ",
          body: `${claim.claimNo} ${claim.benefitName} ${claim.employeeName}${proxy}`,
          href,
          tone: "amber",
        });
      }
    }
    // H07 "คำขอแก้ไขข้อมูลพนักงาน" (โหลดไม่ได้ไม่ทำให้แจ้งเตือนอื่นหาย)
    for (const request of edits ?? []) {
      // คำขอของตัวเองตรวจเองไม่ได้ จึงไม่แจ้ง
      if (request.employeeCode === viewerCode) continue;
      const labels = [...new Set(request.changes.map((change) => change.label))];
      notices.push({
        id: `edit-request-${request.id}-${request.submittedAt}`,
        at: request.submittedAt,
        title: "คำขอแก้ไขข้อมูลพนักงาน",
        body: `${request.employeeName} ขอเปลี่ยน${labels.join("และ")}`,
        href: "/hr/employees?tab=edits",
        tone: "green",
      });
    }
    for (const row of mine.data ?? []) {
      if (row.status === "pending") continue;
      notices.push({ id: `proposal-${row.status}-${row.id}-${row.decided_at ?? ""}`, at: row.decided_at ?? row.submitted_at ?? since, title: DECIDED[row.status].title, body: proposalLabel(row), href: `/hr/benefits/proposals/${row.id}`, tone: DECIDED[row.status].tone });
    }
    for (const row of waiting.data ?? []) {
      // ผู้เสนออนุมัติข้อเสนอของตัวเองไม่ได้
      if (row.proposer?.employee_code === viewerCode) continue;
      const by = row.proposer ? ` จาก ${row.proposer.first_name_th} ${row.proposer.last_name_th === "-" ? "" : row.proposer.last_name_th}`.trimEnd() : "";
      notices.push({ id: `proposal-pending-${row.id}-${row.submitted_at ?? ""}`, at: row.submitted_at ?? since, title: "ข้อเสนอสวัสดิการใหม่รออนุมัติ", body: `${proposalLabel(row)}${by}`, href: `/hr/proposals/${row.id}`, tone: "amber" });
    }
    return notices.map((notice) => ({ ...notice, read: readKeys.has(notice.id) })).sort((a, b) => b.at.localeCompare(a.at));
  } catch (err) {
    console.error("[hr notifications] load failed", err);
    return null;
  }
});

/** ตัวเลขบนเมนูแจ้งเตือน โหลดไม่ได้คืน 0 */
export async function countHrNotifications(viewerCode: string, role: string): Promise<number> {
  return (await getHrNotifications(viewerCode, role))?.filter((notice) => !notice.read).length ?? 0;
}

/** key ของแจ้งเตือนที่ผู้ใช้อ่านแล้ว */
async function getReadKeys(viewerCode: string): Promise<Set<string>> {
  const employeeId = await findEmployeeUuidByCode(viewerCode);
  if (!employeeId) return new Set();
  const { data, error } = await supabaseAdmin.from("hr_notification_read").select("notice_key").eq("employee_id", employeeId);
  if (error) {
    console.error("[hr notifications] read state failed", error);
    return new Set();
  }
  return new Set((data ?? []).map((row) => row.notice_key as string));
}

/** บันทึกว่าอ่านแล้ว (อ่านซ้ำไม่เพิ่มแถว) */
export async function markHrNotificationsRead(viewerCode: string, keys: string[]) {
  const employeeId = await findEmployeeUuidByCode(viewerCode);
  if (!employeeId) throw new Error("employee not found");
  const unique = [...new Set(keys.map((key) => key.trim()).filter(Boolean))].slice(0, 500);
  if (unique.length === 0) return;
  const { error } = await supabaseAdmin
    .from("hr_notification_read")
    .upsert(unique.map((key) => ({ employee_id: employeeId, notice_key: key })), { onConflict: "employee_id,notice_key", ignoreDuplicates: true });
  if (error) throw error;
}
