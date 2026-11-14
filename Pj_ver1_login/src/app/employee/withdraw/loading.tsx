import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet } from "@/features/requester/ui";

const SUMMARY_ROWS = 5;
const SECTIONS = [
  { title: "1. ชื่อผู้ส่งคำขอ", fields: 3, cols: "sm:grid-cols-2 lg:grid-cols-3" },
  { title: "2. ประเภทการยื่นและสวัสดิการ", fields: 0, cols: "" },
  { title: "3. รายละเอียดค่าใช้จ่าย", fields: 4, cols: "sm:grid-cols-2" },
  { title: "4. เอกสารแนบ", fields: 2, cols: "sm:grid-cols-2" },
];

function Field() {
  return (
    <div>
      <Skeleton className="mb-1.5 h-3.5 w-24" />
      <Skeleton className="h-[42px] w-full rounded-lg" />
    </div>
  );
}

// โครงฟอร์มยื่นคำขอ ตรงกับ WithdrawClient (สี่ส่วนด้านซ้าย สรุปคำขอด้านขวา)
export default function WithdrawLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-4">
      <PageHead
        crumbs={[{ label: "ภาพรวม", href: "/employee" }, { label: "ยื่นคำขอ" }]}
        title="ยื่นคำขอสวัสดิการ"
        description="กรอกเฉพาะช่องที่มีเครื่องหมาย * ข้อมูลพนักงานดึงจากระบบ HR อัตโนมัติ"
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          {SECTIONS.map((section) => (
            <Sheet key={section.title} className="flex flex-col gap-3.5 p-5">
              <h2 className="text-16 font-semibold">{section.title}</h2>
              {section.fields === 0 ? (
                <div className="flex items-center gap-3.5 rounded-lg border border-line px-3.5 py-3">
                  <Skeleton className="size-16 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-48 max-w-full" />
                    <Skeleton className="h-3.5 w-40 max-w-full" />
                  </div>
                </div>
              ) : (
                <div className={`grid gap-3.5 ${section.cols}`}>
                  {Array.from({ length: section.fields }).map((_, index) => (
                    <Field key={index} />
                  ))}
                </div>
              )}
            </Sheet>
          ))}
        </div>

        <aside className="flex-[1_1_300px]">
          <Sheet className="flex flex-col gap-2.5 px-5 py-[18px]">
            <h2 className="text-15 font-semibold">สรุปคำขอ</h2>
            <div className="flex flex-col gap-2">
              {Array.from({ length: SUMMARY_ROWS }).map((_, index) => (
                <div key={index} className="flex justify-between gap-3">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="h-[74px] w-full rounded-lg" />
            <Skeleton className="h-[38px] w-full rounded-full" />
            <Skeleton className="h-[38px] w-full rounded-full" />
          </Sheet>
        </aside>
      </div>
    </SkeletonScreen>
  );
}
