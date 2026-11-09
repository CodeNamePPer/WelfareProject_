import { BENEFIT_APPROVAL_COLUMNS, PersonRequestsSkeleton } from "../../HrSkeletons";

export default function BenefitApprovalsLoading() {
  return (
    <PersonRequestsSkeleton
      parent={{ label: "จัดการสวัสดิการ", href: "/hr/benefits" }}
      title="อนุมัติคำขอเพิ่มสวัสดิการ"
      contentClassName="benefit-approval-content"
      tableClassName="person-requests-table benefit-track-table benefit-approval-table"
      columns={BENEFIT_APPROVAL_COLUMNS}
    />
  );
}
