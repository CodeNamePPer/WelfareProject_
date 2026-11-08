import "server-only";
import { listClaims } from "@/lib/claims/service";
import { HR_APPROVED_STATUSES, HR_QUEUE_STATUSES, hrStatusOf, toBangkokDate, toHrCounts } from "@/lib/claims/mappers";
import type { ClaimDbStatus, ClaimEventKind, ClaimRecord, HrStatusCounts } from "@/lib/claims/types";
import type { StatusRow } from "./StatusList";

type Kind = "approved" | "rejected" | "revision";

const EVENT_OF: Record<Kind, ClaimEventKind> = { approved: "hr_approved", rejected: "rejected", revision: "revision_requested" };

export const HR_STATUSES: ClaimDbStatus[] = [...HR_QUEUE_STATUSES, ...HR_APPROVED_STATUSES, "needs_revision", "rejected"];

function toRow(claim: ClaimRecord, kind: Kind): StatusRow {
  const event = [...claim.events].reverse().find((item) => item.kind === EVENT_OF[kind]);
  return {
    requestId: claim.claimNo,
    itemType: "benefit",
    employeeCode: claim.employeeCode,
    fallbackName: claim.employeeName,
    benefit: claim.benefitName,
    amount: claim.amountRequested,
    date: toBangkokDate(event?.at ?? claim.submittedAt ?? claim.createdAt),
    actorCode: event?.actorCode ?? "-",
    note: event?.note ?? undefined,
  };
}

/** แถวของหน้าคำขอตามสถานะ พร้อมตัวเลขของแถบสถานะ คืน null เมื่อโหลดไม่สำเร็จ */
export async function getStatusRows(kind: Kind): Promise<{ rows: StatusRow[]; counts: HrStatusCounts } | null> {
  const claims = await listClaims({ statuses: HR_STATUSES });
  if (!claims) return null;
  return { rows: claims.filter((claim) => hrStatusOf(claim.status) === kind).map((claim) => toRow(claim, kind)), counts: toHrCounts(claims) };
}
