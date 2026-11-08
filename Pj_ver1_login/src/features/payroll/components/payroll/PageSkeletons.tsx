import { Card, PageStack } from "@/features/payroll/components/ui/Card";
import { Skeleton } from "@/features/payroll/components/ui/Skeleton";
import { FieldSkeleton, ListPanelSkeleton, LoadingRegion, PaginationSkeleton, SummaryStripSkeleton } from "@/features/payroll/components/ui/SkeletonParts";

/*
 * Skeleton ของแต่ละหน้า (เฉพาะเนื้อหา ไม่รวมหัวหน้า)
 * ใช้ 2 ที่: loading.tsx ของหน้านั้น (ระหว่างดึงข้อมูล)
 *          และใน View ของหน้านั้น (ระหว่างอ่านการตั้งค่าที่บันทึกไว้ใน browser)
 */

/** หน้า "ดูรายการอนุมัติ / รอจ่าย": แท็บสถานะ + ตัวกรอง 4 ช่อง + ตาราง 7 คอลัมน์ */
export function ApprovalsSkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดรายการอนุมัติ">
      <ListPanelSkeleton heading="tabs" filters={4} filterGrid="md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]" rows={10} cols={7} />
    </LoadingRegion>
  );
}

/** หน้า "ดูข้อมูลย้อนหลัง": หัวข้อ + ตัวกรอง 5 ช่อง + ตาราง 8 คอลัมน์ */
export function HistorySkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดประวัติการจ่าย">
      <ListPanelSkeleton filters={5} filterGrid="sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]" rows={10} cols={8} />
    </LoadingRegion>
  );
}

/** หน้า "ตั้งค่าการจ่ายเงิน": แถบสรุป + ตารางรอจ่าย + แถบตั้งค่าด้านล่าง */
export function PaySettingsSkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดการตั้งค่าการจ่ายเงิน">
      <PageStack>
        <SummaryStripSkeleton />
        <ListPanelSkeleton filters={2} filterGrid="md:grid-cols-[2fr_1fr_auto]" button rows={8} cols={6} />
        <Card className="flex flex-col gap-4 p-5">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 md:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-11 w-32" />
          </div>
        </Card>
      </PageStack>
    </LoadingRegion>
  );
}

/** หน้า "Export รายงาน (Excel)": ตัวกรองซ้าย 300px + สรุปและกราฟขวา */
export function ExportSkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดรายงาน">
      <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
        <Card className="flex flex-col gap-4 p-5">
          <Skeleton className="h-6 w-32" />
          {Array.from({ length: 5 }, (_, i) => (
            <FieldSkeleton key={i} />
          ))}
          <Skeleton className="mt-2 h-11" />
        </Card>
        <Card className="flex min-w-0 flex-col gap-5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-60" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl bg-surface p-4">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-5 w-48" />
            {/* กราฟแท่ง: ความสูงต่างกันให้ดูเป็นกราฟ */}
            <div className="flex h-64 items-end gap-2 pl-12">
              {[45, 70, 30, 85, 55, 65, 40, 90, 50, 75, 35, 60].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </LoadingRegion>
  );
}

/** หน้า "ข้อมูลเพิ่มเติม" (ทั้งของรายการอนุมัติและประวัติ): ตัวกรอง + การ์ดรายละเอียด 3 ใบ */
export function PaymentDetailsSkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดรายละเอียดการจ่าย">
      <div className="flex flex-col gap-8">
        <Card className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 xl:grid-cols-[1fr_1fr_1fr_1.2fr_auto] xl:items-end">
          {Array.from({ length: 4 }, (_, i) => (
            <FieldSkeleton key={i} />
          ))}
          <Skeleton className="h-11 sm:col-span-2 xl:col-span-1 xl:w-32" />
        </Card>
        <div className="flex flex-col">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }, (_, c) => (
              <Card key={c} className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-64 max-w-full" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {Array.from({ length: 3 }, (_, b) => (
                    <div key={b} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4">
                      <Skeleton className="mb-1 h-4 w-32" />
                      {Array.from({ length: 6 }, (_, r) => (
                        <div key={r} className="grid grid-cols-[2fr_3fr] gap-3">
                          <Skeleton className="h-3.5" />
                          <Skeleton className="h-3.5" />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <PaginationSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}
