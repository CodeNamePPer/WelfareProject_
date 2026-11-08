import { getHrEmployees } from "@/lib/hr/employees";
import { revisionRequests } from "../../sample/revision";
import { StatusList, type StatusRow } from "../StatusList";

export const dynamic = "force-dynamic";

const rows: StatusRow[] = revisionRequests.map((request) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: request.submittedAt,
  note: request.correction,
}));

export default async function RevisionRequestsPage() {
  const employees = await getHrEmployees();
  return <StatusList kind="revision" rows={rows} employees={employees} />;
}
