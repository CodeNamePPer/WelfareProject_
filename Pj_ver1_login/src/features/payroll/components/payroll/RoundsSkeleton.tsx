import { Card, PageStack } from "@/features/payroll/components/ui/Card";
import { Skeleton } from "@/features/payroll/components/ui/Skeleton";
import { ListPanelSkeleton, LoadingRegion } from "@/features/payroll/components/ui/SkeletonParts";

/**
 * Skeleton หน้า "ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย"
 * การ์ดรอบจ่ายถัดไป + การ์ดรอบทั้งหมด / ตารางเลื่อนวันจ่าย / ตารางรอบการจ่าย
 */
export function RoundsSkeleton() {
  return (
    <LoadingRegion label="กำลังโหลดข้อมูลรอบจ่าย">
      <PageStack>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="flex flex-col gap-3 border-primary-100 bg-primary-50 p-5 sm:flex-row sm:items-end sm:justify-between md:col-span-2">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-44" />
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-3.5 w-72 max-w-full" />
            </div>
            <Skeleton className="h-10 w-40" />
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3.5 w-full" />
          </Card>
        </div>
        <ListPanelSkeleton filters={2} filterGrid="md:grid-cols-[2fr_1fr]" rows={6} cols={8} />
        <ListPanelSkeleton filters={2} filterGrid="md:grid-cols-[1fr_1fr_auto]" button rows={5} cols={6} />
      </PageStack>
    </LoadingRegion>
  );
}
