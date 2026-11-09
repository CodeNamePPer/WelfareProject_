import { Skeleton, SkeletonScreen } from "@/components/Skeleton";

// โครงหน้าระหว่างรอตรวจสอบ session
export default function ChangePasswordLoading() {
  return (
    <SkeletonScreen className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-[24px]">
        <p className="mb-2 text-13 font-semibold text-muted">ระบบพนักงานและสวัสดิการ</p>
        <h1 className="text-22 font-semibold text-ink">ตั้งรหัสผ่านใหม่</h1>
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1.5 h-4 w-2/3" />
        <div className="mt-[20px] flex flex-col gap-[16px]">
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </SkeletonScreen>
  );
}
