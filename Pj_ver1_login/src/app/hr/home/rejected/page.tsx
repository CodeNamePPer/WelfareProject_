import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { rejectedRequests } from "../../sample/rejected";
import { thaiShortDateToIso, sampleActor } from "../../sample/history";
import { StatusList, type StatusRow } from "../StatusList";

export const metadata: Metadata = { title: "คำขอที่ปฏิเสธแล้ว" };

export const dynamic = "force-dynamic";

const rows: StatusRow[] = rejectedRequests.map((request, index) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: thaiShortDateToIso(request.rejectedAt),
  actorCode: sampleActor(index),
  note: request.reason,
}));

export default async function RejectedRequestsPage() {
  const employees = await getHrEmployees();
  return <StatusList kind="rejected" rows={rows} employees={employees} />;
}
