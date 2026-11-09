import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { FactsSkeleton } from "../../../HrSkeletons";

// โครงหน้ารายละเอียดคำขอ เลขคำขอและชื่อสวัสดิการยังไม่รู้จนกว่าข้อมูลจะมา
export default function RequestDetailLoading() {
  return (
    <SkeletonScreen className="page-content queue-page request-page">
      <Skeleton className="h-4 w-56" />

      <header className="queue-heading request-heading">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-[8px] h-8 w-72 max-w-full" />
        <ul className="queue-summary">
          <li><Skeleton className="inline-block h-6 w-20 rounded-full align-middle" /></li>
          <li><Skeleton className="inline-block h-4 w-28 align-middle" /></li>
          <li><Skeleton className="inline-block h-4 w-32 align-middle" /></li>
        </ul>
      </header>

      <div className="request-layout">
        <div className="request-main">
          <section className="queue-sheet request-section">
            <h2>รายละเอียดคำขอ</h2>
            <FactsSkeleton count={8} />
          </section>

          <section className="queue-sheet request-section">
            <div className="request-section-head">
              <h2>เอกสารแนบ</h2>
            </div>
            <ul className="request-attachments">
              {Array.from({ length: 2 }).map((_, index) => (
                <li key={index}>
                  <Skeleton className="h-28 w-full rounded-md" />
                  <Skeleton className="mt-[6px] h-4 w-32 max-w-full" />
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="request-aside">
          <section className="queue-sheet request-section">
            <h2>ผู้ยื่นคำขอ</h2>
            <Skeleton className="h-5 w-40" />
            <FactsSkeleton count={6} className="request-employee-facts" />
          </section>

          <section className="queue-sheet request-section request-decision">
            <h2>การพิจารณา</h2>
            <div className="request-decision-actions request-decision-choices">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          </section>
        </aside>
      </div>
    </SkeletonScreen>
  );
}
