import { Skeleton, SkeletonScreen } from '@/components/Skeleton';
import { Card, PageHeader } from '@/features/hr/ui';

// โครงหน้าการเงินระหว่างรอข้อมูล: หัวข้อจริง ช่องสรุป และแถวตาราง
export function FinLoading({ title, description, tiles = 0, rows = 4, tabs = false }: { title: string; description?: string; tiles?: number; rows?: number; tabs?: boolean }) {
  return (
    <SkeletonScreen className="flex w-full flex-col gap-4 text-14 leading-[1.55] text-ink">
      <PageHeader title={title} description={description} />
      {tiles > 0 ? (
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: tiles }).map((_, index) => (
            <div key={index} className="flex min-w-0 flex-[1_1_160px] flex-col gap-2 rounded-[8px] border border-line bg-white px-4 py-3.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : null}
      <Card>
        {tabs ? (
          <div className="flex gap-[18px] overflow-hidden border-b border-line px-5 py-3.5">
            {['w-28', 'w-28', 'w-20', 'w-16'].map((width, index) => (
              <Skeleton key={index} className={`h-4 shrink-0 ${width}`} />
            ))}
          </div>
        ) : null}
        <div className="h-8 bg-[#F8FAFC]" />
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 border-t border-[#F1F5F9] px-5 py-3.5">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        ))}
      </Card>
    </SkeletonScreen>
  );
}
