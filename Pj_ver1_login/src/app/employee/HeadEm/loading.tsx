import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const STEPS = ["ข้อมูลพนักงานและคำขอ", "เอกสารและยืนยัน"];
const SUMMARY_ROWS = 6;

function Field() {
  return (
    <div>
      <Skeleton className="mb-1.5 h-4 w-28" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

// หน้านี้โหลดสิทธิ์ของลูกน้องทุกคน จึงเป็นหน้าที่ใช้เวลารอนานที่สุดในส่วนพนักงาน
export default function HeadEmLoading() {
  return (
    <SkeletonScreen className="mx-auto min-w-[1080px] max-w-[1480px] bg-white px-4 py-4 text-ink">
      <header className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-22 font-semibold tracking-tight text-ink">ยื่นคำขอสวัสดิการแทนพนักงาน</h1>
          <p className="mt-1 text-13 text-muted">เลือกพนักงาน ตรวจสอบสิทธิ์ และส่งคำขอพร้อมเอกสารประกอบ</p>
        </div>
        <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-12 font-medium text-primary-600">หัวหน้างาน · ยื่นแทน</span>
      </header>

      <div className="mt-4 flex items-center rounded-lg border border-line bg-white px-4 py-3">
        {STEPS.map((step, index) => (
          <div key={step} className="flex flex-1 items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-12 font-semibold ${index === 0 ? "border-primary-500 bg-primary-100 text-primary-700" : "border-line bg-white text-muted"}`}>
              {index + 1}
            </span>
            <span className={`text-13 ${index === 0 ? "font-medium text-ink" : "text-muted"}`}>{step}</span>
            {index < STEPS.length - 1 ? <span className="mx-4 h-px flex-1 bg-line" /> : null}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5">
        <section className="rounded-lg border border-line bg-white p-5">
          <div className="mb-5">
            <h2 className="text-17 font-semibold text-ink">ข้อมูลพนักงานและคำขอ</h2>
            <p className="mt-1 text-13 text-muted">ตรวจสอบข้อมูลผู้รับสิทธิ์ก่อนกรอกรายละเอียดการเบิก</p>
          </div>

          <div className="rounded-lg border border-line bg-surface p-4">
            <Field />
            <Skeleton className="mt-3 h-[68px] w-full rounded-md" />
          </div>

          <div className="mt-4 border-t border-line pt-4">
            <h3 className="text-14 font-semibold text-ink">ข้อมูลคำขอสวัสดิการ</h3>
            <div className="mt-3 grid grid-cols-2 gap-4">
              <Field />
              <Field />
              <Field />
              <Field />
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="text-14 font-semibold text-ink">ตรวจสอบก่อนส่ง</h2>
            <div className="mt-3 space-y-3 rounded-md border border-line bg-surface p-3">
              {Array.from({ length: SUMMARY_ROWS }).map((_, index) => (
                <div key={index} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </SkeletonScreen>
  );
}
