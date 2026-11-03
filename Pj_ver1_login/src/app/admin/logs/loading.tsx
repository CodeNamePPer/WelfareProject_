import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { table } from "@/components/ui/table";

const ROW_COUNT = 10; // พอเต็มจอแรก – LogsPage แสดงหน้าละ 20
const COLUMNS = ["วันเวลา", "ผู้ดำเนินการ", "รายการ", "รายละเอียด", "ประเภท"];

// โครงหน้าประวัติการแก้ไข Log ระหว่างรอโหลด
export default function AdminLogsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[20px]">
      <PageHeader
        title="ประวัติการแก้ไข Log"
        description="บันทึกการเปลี่ยนแปลงระบบ · Admin จัดการระบบได้ แต่ไม่สามารถอนุมัติคำขอเบิก · ลบหรือแก้ไขไม่ได้"
      />

      <div className="flex flex-col gap-[10px] lg:flex-row">
        <Skeleton className="h-10 w-full flex-1 rounded-lg" />
        <div className="grid grid-cols-2 gap-[10px] sm:flex">
          <Skeleton className="h-10 w-full rounded-lg sm:w-[110px]" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-[170px]" />
          <Skeleton className="col-span-2 h-10 w-full rounded-lg sm:w-[180px]" />
        </div>
      </div>

      <section className="flex flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
        <div className="flex gap-[8px] overflow-x-auto">
          <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-32 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-32 shrink-0 rounded-full" />
          <Skeleton className="h-8 w-36 shrink-0 rounded-full" />
        </div>

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
                  <td className={table.td}><Skeleton className="h-4 w-28" /></td>
                  <td className={table.td}>
                    <div className="flex flex-col gap-[6px]">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </td>
                  <td className={table.td}><Skeleton className="h-4 w-40" /></td>
                  <td className={table.td}><Skeleton className="h-4 w-52" /></td>
                  <td className={table.td}><Skeleton className="h-6 w-20 rounded-full" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-[8px]">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
      </section>
    </SkeletonScreen>
  );
}
