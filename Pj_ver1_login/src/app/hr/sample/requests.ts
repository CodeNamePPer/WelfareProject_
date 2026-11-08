// ค้นหาคำขอตัวอย่างจากทุกสถานะด้วยเลขที่คำขอ ใช้ในหน้ารายละเอียดคำขอ
import { pendingRequests, type PendingRequest } from "./queue";
import { approvedRequests } from "./approved";
import { rejectedRequests } from "./rejected";
import { revisionRequests } from "./revision";
import { sampleActor, thaiShortDateToIso } from "./history";

export type RequestStatus = "pending" | "approved" | "rejected" | "revision";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
  revision: "รอพนักงานแก้ไข",
};

/** คำขอที่ดำเนินการแล้ว: ใคร ทำอะไร เมื่อไร เพราะอะไร */
export type DecisionRecord = { actorCode: string; date: string; note?: string };

export type RequestDetail = { status: RequestStatus; request: PendingRequest; decision: DecisionRecord | null };

export function findRequest(id: string): RequestDetail | null {
  const pending = pendingRequests.find((request) => request.id === id);
  if (pending) return { status: "pending", request: pending, decision: null };

  const approvedIndex = approvedRequests.findIndex((request) => request.requestId === id);
  if (approvedIndex >= 0) {
    const r = approvedRequests[approvedIndex];
    return {
      status: "approved",
      request: { id: r.requestId, itemType: r.itemType, employeeCode: r.employeeId, fallbackName: r.name, benefit: r.benefit, used: r.used, limit: r.limit, amount: r.amount, submitted: thaiShortDateToIso(r.approvedAt) },
      decision: { actorCode: sampleActor(approvedIndex), date: thaiShortDateToIso(r.approvedAt) },
    };
  }

  const rejectedIndex = rejectedRequests.findIndex((request) => request.requestId === id);
  if (rejectedIndex >= 0) {
    const r = rejectedRequests[rejectedIndex];
    return {
      status: "rejected",
      request: { id: r.requestId, itemType: r.itemType, employeeCode: r.employeeId, fallbackName: r.name, benefit: r.benefit, used: r.used, limit: r.limit, amount: r.amount, submitted: thaiShortDateToIso(r.rejectedAt) },
      decision: { actorCode: sampleActor(rejectedIndex), date: thaiShortDateToIso(r.rejectedAt), note: r.reason },
    };
  }

  const revisionIndex = revisionRequests.findIndex((request) => request.requestId === id);
  if (revisionIndex >= 0) {
    const r = revisionRequests[revisionIndex];
    return {
      status: "revision",
      request: { id: r.requestId, itemType: r.itemType, employeeCode: r.employeeId, fallbackName: r.name, benefit: r.benefit, used: 0, limit: 0, amount: r.amount, submitted: thaiShortDateToIso(r.submittedAt) },
      decision: { actorCode: sampleActor(revisionIndex), date: thaiShortDateToIso(r.submittedAt), note: r.correction },
    };
  }

  return null;
}
