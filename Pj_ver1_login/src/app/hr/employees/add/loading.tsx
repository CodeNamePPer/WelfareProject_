import { SkeletonScreen } from "@/components/Skeleton";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmployeeFormSkeleton } from "../../HrSkeletons";

// มีไฟล์นี้เพื่อไม่ให้หน้าฟอร์มไปแสดงโครงตารางของ /hr/employees
export default function AddEmployeeLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main employee-add-main">
        <div className="page-content employee-add-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: "เพิ่มพนักงานรายบุคคล" }]} />
          <div className="employee-add-heading">
            <h1>เพิ่มพนักงานรายบุคคล</h1>
            <p>กรอกข้อมูลพนักงานเพื่อกำหนดสิทธิ์และคำนวณสวัสดิการ</p>
          </div>
          <EmployeeFormSkeleton title="1. แก้ไขข้อมูลส่วนตัวและข้อมูลการทำงาน" identityTitle="ข้อมูลระบุตัวตน" sideTitle="เงื่อนไขการคำนวณสิทธิสวัสดิการ" identityFields={15} sideFields={6} />
        </div>
      </div>
    </SkeletonScreen>
  );
}
