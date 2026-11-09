import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const SUMMARY_ROWS = 7;

function Field({ wide = false }: { wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export default function WithdrawLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1250px] px-4 py-5 text-ink">
      <div className="mb-4">
        <h1 className="text-22 font-semibold tracking-[-0.04em] text-ink">ยื่นคำขอวัสดิการ</h1>
        <p className="mt-1 text-13 text-muted">แบบฟอร์มยื่นคำขอเบิกสวัสดิการตามสิทธิ์ของคุณ</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
        <div className="rounded-xl border border-line bg-white p-5">
          <div className="mb-5">
            <h2 className="text-18 font-semibold text-ink">1. ข้อมูลผู้ยื่น</h2>
            <p className="mt-1 text-13 text-muted">ข้อมูลส่วนบุคคล และสิทธิ์ที่สามารถเบิกได้</p>
          </div>

          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-surface p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field />
                <Field />
                <Field wide />
              </div>
            </div>

            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="mb-4 text-18 font-semibold text-ink">2. ข้อมูลคำขอและค่าใช้จ่าย</h3>
              <div className="space-y-4">
                <Field />
                <Field />
                <Field />
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <Skeleton className="h-10 w-24 rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-lg" />
            </div>
          </div>
        </div>

        <aside className="rounded-xl border border-line bg-white p-5">
          <h3 className="mb-4 text-18 font-semibold text-ink">ตรวจสอบก่อนส่ง</h3>
          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            {Array.from({ length: SUMMARY_ROWS }).map((_, index) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="mt-5 h-32 w-full rounded-xl" />
        </aside>
      </div>
    </SkeletonScreen>
  );
}
