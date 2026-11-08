import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { revisionRequests } from "../../sample/revision";
import { thaiShortDateToIso, sampleActor } from "../../sample/history";
import { StatusList, type StatusRow } from "../StatusList";

export const metadata: Metadata = { title: "คำขอที่รอพนักงานแก้ไข" };

export const dynamic = "force-dynamic";

const rows: StatusRow[] = revisionRequests.map((request, index) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: thaiShortDateToIso(request.submittedAt),
  actorCode: sampleActor(index),
  note: request.correction,
}));

export default async function RevisionRequestsPage() {
  const employees = await getHrEmployees();
  return <StatusList kind="revision" rows={rows} employees={employees} />;
}
