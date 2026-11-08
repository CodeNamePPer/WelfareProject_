import { getHrEmployees } from "@/lib/hr/employees";
import { approvedRequests } from "../../sample/approved";
import { StatusList, type StatusRow } from "../StatusList";

export const dynamic = "force-dynamic";

const rows: StatusRow[] = approvedRequests.map((request) => ({
  requestId: request.requestId,
  itemType: request.itemType,
  employeeCode: request.employeeId,
  fallbackName: request.name,
  benefit: request.benefit,
  amount: request.amount,
  date: request.approvedAt,
}));

export default async function ApprovedRequestsPage() {
  const employees = await getHrEmployees();
  return <StatusList kind="approved" rows={rows} employees={employees} />;
}
