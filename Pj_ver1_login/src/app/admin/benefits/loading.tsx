import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { table } from "@/components/ui/table";

const TABS = ["สวัสดิการที่มีอยู่", "คำขอเบิก", "ประวัติการแก้ไข", "นำเข้าประวัติ"];
const COLUMNS = ["รหัส", "ชื่อสวัสดิการ", "วงเงิน", "ประเภทงบ", "สถานะ"];
const ROW_COUNT = 6;

// โครงหน้าจัดการสวัสดิการระหว่างรอโหลด — แสดงแท็บแรก (สวัสดิการที่มีอยู่) เป็นค่าเริ่มต้น
export default function AdminBenefitsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[20px]">
      <PageHeader title="จัดการสวัสดิการ" description="เพิ่มและแก้ไขสวัสดิการได้ทันที คำขอเบิกและการนำเข้าประวัติยังเป็นข้อมูลตัวอย่าง" />

      {/* แถบแท็บ: ใช้ข้อความจริงแต่ยังกดไม่ได้ เพื่อให้ความสูงตรงกับหน้าจริง */}
      <div className="rounded-[10px] border border-line bg-white">
      <div aria-hidden="true" className="flex gap-[4px] overflow-x-auto border-b border-line px-[8px] sm:px-[12px]">
        {TABS.map((label, i) => (
          <span
            key={label}
            className={
              i === 0
                ? "-mb-px border-b-2 border-primary-600 px-[18px] py-[12px] text-14 font-semibold whitespace-nowrap text-primary-700"
                : "-mb-px border-b-2 border-transparent px-[18px] py-[12px] text-14 whitespace-nowrap text-muted"
            }
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 divide-y divide-line border-b border-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-[6px] p-[16px] sm:p-[20px]">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-[4px] h-6 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_350px]">
        <section className="flex min-w-0 flex-col gap-[16px] border-b border-line p-[20px] xl:border-b-0 xl:border-r">
          <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-10 w-full rounded-lg sm:w-[180px]" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg sm:max-w-[400px]" />

          <div className={table.wrapper}>
            <table className={table.table}>
              <thead>
                <tr>
                  {COLUMNS.map((col) => (
                    <th key={col} scope="col" className={table.th}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: ROW_COUNT }).map((_, i) => (
                  <tr key={i}>
                    <td className={table.td}><Skeleton className="h-4 w-14" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-40" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-16" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-14" /></td>
                    <td className={table.td}><Skeleton className="h-6 w-16 rounded-md" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* รายละเอียดสวัสดิการที่เลือก */}
        <div className="flex flex-col gap-[14px] p-[20px] xl:self-start">
          <div className="flex items-start justify-between gap-[12px]">
            <div className="flex flex-col gap-[6px]">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          {[4, 3].map((count, s) => (
            <div key={s} className="flex flex-col gap-[10px] border-t border-line pt-[14px]">
              <Skeleton className="h-4 w-28" />
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      </div>
    </SkeletonScreen>
  );
}
