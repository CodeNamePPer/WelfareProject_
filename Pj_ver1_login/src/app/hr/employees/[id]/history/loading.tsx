import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmployeeHistoryBodySkeleton } from "../../../HrSkeletons";

export default function EmployeeHistoryLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main employee-history-main">
        <div className="page-content employee-history-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "ดูประวัติ" }]} />
          <Skeleton className="h-8 w-72 max-w-full" />
          <p className="employee-history-subtitle">ประวัติสวัสดิการพนักงาน</p>
          <EmployeeHistoryBodySkeleton />
        </div>
      </div>
    </SkeletonScreen>
  );
}
