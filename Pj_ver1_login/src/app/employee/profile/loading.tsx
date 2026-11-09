import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const PROFILE_FIELDS = 12;
const REQUEST_ROWS = 3;

function Field({ wide = false }: { wide?: boolean }) {
  return <Skeleton className={`h-[66px] w-full rounded-2xl ${wide ? "sm:col-span-2" : ""}`} />;
}

export default function ProfileLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1500px] px-1 pb-10 pt-2 text-13 text-ink">
      <div className="rounded-[28px] border border-line bg-gradient-to-br from-slate-50 via-white to-sky-50/80 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.06)]">
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
          <div>
            <div className="mb-1 text-11 font-medium uppercase tracking-[0.14em] text-muted">พนักงาน / โปรไฟล์ของฉัน</div>
            <h1 className="text-22 font-semibold tracking-[-0.04em] text-ink">โปรไฟล์ของฉัน</h1>
            <p className="mt-1 text-12 text-ink-soft">ตรวจสอบข้อมูลส่วนตัวและติดตามคำขอเปลี่ยนแปลงข้อมูลของคุณ</p>
          </div>
          <Link href="/employee/profile/changeprofile" className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-12 font-medium text-white transition hover:bg-primary-700">
            ยื่นคำขอเปลี่ยนข้อมูล
          </Link>
        </header>

        <Skeleton className="mt-4 h-[76px] w-full rounded-2xl" />

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.92fr)]">
          <section className="rounded-[24px] border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-14 font-semibold text-ink">ข้อมูลส่วนตัว</h2>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="mt-4 flex items-center gap-3 border-b border-line pb-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="flex flex-col gap-[8px]">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: PROFILE_FIELDS }).map((_, index) => (
                <Field key={index} />
              ))}
              <Field wide />
              <Field wide />
            </div>
          </section>

          <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <section className="rounded-[24px] border border-line bg-white p-4">
              <h2 className="text-14 font-semibold text-ink">การแก้ไขล่าสุด</h2>
              <div className="mt-3 space-y-3">
                <Field />
                <Field />
              </div>
            </section>
            <section className="rounded-[24px] border border-line bg-white p-4">
              <h2 className="text-14 font-semibold text-ink">เมื่อข้อมูลไม่ถูกต้อง</h2>
              <p className="mt-3 text-12 leading-6 text-ink-soft">
                ยื่นคำขอพร้อมเหตุผลและหลักฐานให้ฝ่ายบุคคลตรวจสอบ
                เมื่อข้อมูลได้รับการตรวจสอบและอนุมัติแล้ว ระบบจะอัปเดตให้
              </p>
            </section>
          </div>
        </div>

        <section className="mt-5 rounded-[24px] border border-line bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-14 font-semibold text-ink">คำขอเปลี่ยนข้อมูลของฉัน</h2>
            <Skeleton className="h-3 w-44" />
          </div>
          <div className="mt-3 space-y-2">
            {Array.from({ length: REQUEST_ROWS + 1 }).map((_, index) => (
              <Skeleton key={index} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        </section>
      </div>
    </SkeletonScreen>
  );
}
