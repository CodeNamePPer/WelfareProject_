import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { table } from "@/components/ui/table";

const ROW_COUNT = 10;
const COLUMNS = ["รหัส", "ชื่อ", "Email", "บทบาท", "สถานะ", "ใช้งานล่าสุด"];

// โครงหน้าผู้ใช้งานระหว่างรอโหลดรายชื่อ (sidebar มาจาก admin/layout อยู่แล้ว)
export default function AdminUsersLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[24px]">
      <PageHeader title="ตั้งค่าผู้ใช้งานระบบ" description="จัดการบัญชี เช็คสถานะ และการเข้าใช้งาน" />

      <div className="rounded-[10px] border border-line bg-white">
        <section className="flex min-w-0 flex-col gap-[16px] p-[20px]">
          <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-17 font-semibold text-ink">รายชื่อผู้ใช้งานระบบ</h2>
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
      </div>
    </SkeletonScreen>
  );
}
