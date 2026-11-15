import { Skeleton } from "@/components/Skeleton";

// โครงหน้าระหว่างโหลดของฟอร์มเพิ่ม/แก้ไขพนักงาน (หน้า HR รุ่นแรกที่ยังใช้ class เดิม)

function FormFieldsSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="profile-field">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      ))}
    </>
  );
}

/** ฟอร์มข้อมูลพนักงาน ใช้ทั้งหน้าเพิ่มและหน้าแก้ไข */
export function EmployeeFormSkeleton({
  title,
  identityTitle,
  sideTitle,
  identityFields,
  sideFields,
}: {
  title: string;
  identityTitle: string;
  sideTitle: string;
  identityFields: number;
  sideFields: number;
}) {
  return (
    <div className="employee-profile-form">
      <section className="employee-profile-card">
        <h2>{title}</h2>
        <div className="employee-profile-grid">
          <section className="employee-profile-identity">
            <h3>{identityTitle}</h3>
            <div className="employee-identity-fields">
              <FormFieldsSkeleton count={identityFields} />
            </div>
          </section>
          <section className="employee-profile-benefits">
            <h3>{sideTitle}</h3>
            <FormFieldsSkeleton count={sideFields} />
          </section>
        </div>
        <footer className="employee-profile-footer">
          <Skeleton className="h-4 w-48" />
          <div className="form-actions">
            <Skeleton className="h-10 w-20 rounded-lg" />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </footer>
      </section>
    </div>
  );
}
