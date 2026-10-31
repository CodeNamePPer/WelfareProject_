import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

// โครงหน้าแรกระหว่างรอตรวจสอบ session
export default function HomeLoading() {
  return (
    <SkeletonScreen className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-mist bg-slip px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">ระบบสวัสดิการพนักงาน</h1>
            <p className="text-xs text-ink-mute">Welfare & Employee Portal</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-mist bg-slip p-8 shadow-sm">
          <Skeleton className="mx-auto mb-4 h-14 w-14 rounded-full" />
          <Skeleton className="mx-auto h-6 w-56" />
          <Skeleton className="mx-auto mt-2 h-4 w-44" />
          <div className="mt-6 space-y-2 rounded-lg border border-mist bg-paper p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      </main>
    </SkeletonScreen>
  );
}
