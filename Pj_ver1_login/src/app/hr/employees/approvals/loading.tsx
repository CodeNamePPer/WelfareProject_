import { EMPLOYEE_APPROVAL_COLUMNS, PersonRequestsSkeleton } from "../../HrSkeletons";

export default function EmployeeApprovalsLoading() {
  return (
    <PersonRequestsSkeleton
      parent={{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }}
      title="อนุมัติคำขอเพิ่มพนักงาน"
      contentClassName="person-approval-content"
      tableClassName="person-requests-table employee-approval-table"
      columns={EMPLOYEE_APPROVAL_COLUMNS}
    />
  );
}
