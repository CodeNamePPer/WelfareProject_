import { getHrEmployees } from "@/lib/hr/employees";
import { rejectedRequests } from "../../sample/rejected";
import { StatusList, type StatusRow } from "../StatusList";

export const dynamic = "force-dynamic";

const rows: StatusRow[] = rejectedRequests.map((request) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: request.rejectedAt,
  note: request.reason,
}));

export default async function RejectedRequestsPage() {
  const employees = await getHrEmployees();
  return <StatusList kind="rejected" rows={rows} employees={employees} />;
}
