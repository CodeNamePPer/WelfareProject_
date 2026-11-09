import { SkeletonScreen } from "@/components/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmployeeFormSkeleton } from "../../../HrSkeletons";

export default function EditEmployeeLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main employee-add-main">
        <div className="page-content employee-add-content employee-edit-page-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "แก้ประวัติพนักงาน" }]} />
          <div className="employee-add-heading">
            <h1>แก้ประวัติพนักงาน</h1>
            <p>ปรับปรุงข้อมูลส่วนตัวและข้อมูลการทำงาน</p>
          </div>
          <EmployeeFormSkeleton title="ข้อมูลส่วนตัวและข้อมูลการทำงาน" identityTitle="ข้อมูลระบุตัวตน" sideTitle="ข้อมูลครอบครัวและการติดต่อ" identityFields={9} sideFields={4} />
        </div>
      </div>
    </SkeletonScreen>
  );
}
