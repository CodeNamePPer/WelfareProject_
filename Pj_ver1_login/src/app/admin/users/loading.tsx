import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

const ROW_COUNT = 8;
const COLUMNS = ["รหัสพนักงาน", "อีเมล", "ชื่อ-นามสกุล", "บทบาท", "สถานะ", "แก้ไขล่าสุด", "จัดการ"];

// โครงหน้าจัดการผู้ใช้ระหว่างรอโหลดรายชื่อพนักงาน
export default function AdminUsersLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-mist pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">จัดการผู้ใช้งานระบบ</h1>
          <p className="mt-1 text-ink-mute">แก้ไขข้อมูลพนักงาน กำหนดสิทธิ์ และสถานะการใช้งาน (สำหรับ Super Admin)</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </header>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-9 w-full sm:w-80 rounded-lg" />
          <Skeleton className="h-3 w-36" />
        </div>

        <div className="overflow-x-auto rounded-lg border border-mist shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slip border-b border-mist text-ink font-semibold">
              <tr>
                {COLUMNS.map((col, i) => (
                  <th
                    key={col}
                    className={`px-4 py-3 whitespace-nowrap ${i === COLUMNS.length - 1 ? "text-right" : ""}`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {Array.from({ length: ROW_COUNT }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-44" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-20 rounded-md" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-16 rounded-md" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-3 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="ml-auto h-4 w-10" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SkeletonScreen>
  );
}
