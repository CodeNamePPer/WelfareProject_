import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

// มีไฟล์นี้เพื่อไม่ให้หน้าฟอร์มไปแสดงโครงตารางของ /hr/benefits
export default function AddBenefitLoading() {
  return (
    <SkeletonScreen className="app-shell">
      <div className="app-main benefits-main">
        <div className="page-content benefits-content">
          <Skeleton className="h-4 w-64 max-w-full" />
          <div className="benefit-form-heading">
            <Skeleton className="h-8 w-56" />
          </div>

          <div className="benefit-form">
            <section className="benefit-form-card">
              <h2>ข้อมูลพื้นฐานสวัสดิการ</h2>
              <p className="benefit-form-subtitle">Basic Information</p>
              <div className="benefit-basic-grid">
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="benefit-field-wide h-[135px] w-full rounded-lg" />
              </div>
            </section>

            <section className="benefit-form-card">
              <h2>การกำหนดวงเงินและงบประมาณ</h2>
              <p className="benefit-form-subtitle">Quota Settings</p>
              <div className="benefit-quota-grid">
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-11 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
                <Skeleton className="h-28 w-full rounded-lg" />
              </div>
            </section>
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
