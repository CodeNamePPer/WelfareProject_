import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const REVIEW_ROWS = 6;

export default function ChangeProfileLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1160px] px-1 pb-8 pt-2 text-13 text-ink">
      <Skeleton className="mb-3 h-4 w-72 max-w-full" />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-22 font-semibold tracking-tight text-ink">ยื่นคำขอเปลี่ยนข้อมูล</h1>
          <p className="mt-1 text-12 text-ink-soft">กรอกข้อมูลที่ต้องการเปลี่ยนและแนบหลักฐาน · ช่องที่มี * จำเป็นต้องกรอก</p>
        </div>
        <Link href="/employee/profile" className="inline-flex min-h-9 items-center rounded-md border border-line bg-white px-3 text-12 font-medium text-ink-soft transition hover:bg-surface">
          กลับไปโปรไฟล์
        </Link>
      </header>

      <Skeleton className="mb-4 h-[68px] w-full rounded-md" />
      <Skeleton className="mb-4 h-11 w-full rounded-md" />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.8fr)_minmax(250px,0.8fr)]">
        <div className="grid min-w-0 gap-4">
          <section className="rounded-md border border-line bg-white p-4">
            <h2 className="text-13 font-semibold text-ink">ข้อมูลผู้ยื่นคำขอ</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex flex-col gap-[6px]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32 max-w-full" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-3 h-3 w-64 max-w-full" />
          </section>

          <section className="rounded-md border border-line bg-white p-4">
            <h2 className="text-13 font-semibold text-ink">ข้อมูลที่ขอเปลี่ยน</h2>
            <Skeleton className="mt-3 h-10 w-full rounded-md" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <Skeleton className="mt-3 h-[88px] w-full rounded-md" />
          </section>

          <section className="rounded-md border border-line bg-white p-4">
            <h2 className="text-13 font-semibold text-ink">หลักฐานประกอบคำขอ</h2>
            <Skeleton className="mt-3 min-h-24 w-full rounded-md" />
          </section>
        </div>

        <aside className="grid content-start gap-4">
          <section className="rounded-md border border-line bg-white p-4">
            <h2 className="text-13 font-semibold text-ink">ตรวจสอบก่อนส่ง</h2>
            <div className="mt-3 space-y-3">
              {Array.from({ length: REVIEW_ROWS }).map((_, index) => (
                <div key={index} className="flex flex-col gap-[6px]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32 max-w-full" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </SkeletonScreen>
  );
}
