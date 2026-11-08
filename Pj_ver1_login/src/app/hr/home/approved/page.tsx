import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { approvedRequests } from "../../sample/approved";
import { thaiShortDateToIso, sampleActor } from "../../sample/history";
import { readRequestFilters } from "../../urlFilters";
import { StatusList, type StatusRow } from "../StatusList";

export const metadata: Metadata = { title: "คำขอที่อนุมัติแล้ว" };

export const dynamic = "force-dynamic";

const rows: StatusRow[] = approvedRequests.map((request, index) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: thaiShortDateToIso(request.approvedAt),
  actorCode: sampleActor(index),
}));

export default async function ApprovedRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [employees, params] = await Promise.all([getHrEmployees(), searchParams]);
  return <StatusList kind="approved" rows={rows} employees={employees} initialFilters={readRequestFilters(params)} />;
}
