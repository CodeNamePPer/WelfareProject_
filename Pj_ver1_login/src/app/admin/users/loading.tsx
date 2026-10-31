import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { table } from "@/components/ui/table";

const ROW_COUNT = 7;
const COLUMNS = ["รหัส", "ชื่อ", "Email", "บทบาท", "สถานะ", "ใช้งานล่าสุด"];

// โครงหน้าผู้ใช้งานระหว่างรอโหลดรายชื่อ (sidebar มาจาก admin/layout อยู่แล้ว)
export default function AdminUsersLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[24px]">
      <PageHeader title="ตั้งค่าผู้ใช้งานระบบ" description="จัดการบัญชี เช็คสถานะ และการเข้าใช้งาน" />

      <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_355px]">
        <section className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
          <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-[17px] font-semibold text-ink">รายชื่อผู้ใช้งานระบบ</h2>
            <Skeleton className="h-10 w-full rounded-lg sm:w-[200px]" />
          </div>

          <Skeleton className="h-10 w-full rounded-lg sm:max-w-[400px]" />

          <div className="flex gap-[8px]">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
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
                    <td className={table.td}><Skeleton className="h-4 w-12" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-28" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-40" /></td>
                    <td className={table.td}><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className={table.td}><Skeleton className="h-6 w-16 rounded-md" /></td>
                    <td className={table.td}><Skeleton className="h-4 w-20" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-auto flex items-center justify-between pt-[8px]">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-40 rounded-lg" />
          </div>
        </section>

        <div className="flex flex-col gap-[14px] rounded-[10px] border border-line bg-white p-[20px] xl:self-start">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-[6px]">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-6 w-16 rounded-md" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-[6px]">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
          <div className="flex flex-col gap-[6px]">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-28 w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-2 gap-[8px]">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
      </div>
    </SkeletonScreen>
  );
}
