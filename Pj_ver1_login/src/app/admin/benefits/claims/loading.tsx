import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";

// โครงหน้าคำขอเบิกทั้งหมดของ Admin ระหว่างรอโหลด (ตารางแบบ Figma)
export default function AdminClaimsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[20px]">
      <PageHeader title="คำขอเบิกทั้งหมด" description="คำขอเบิกสวัสดิการของพนักงานทุกคน อ่านอย่างเดียว HR และการเงินเป็นผู้ตรวจ" />
      <div className="flex flex-col gap-[12px] rounded-[10px] border border-line bg-white p-[20px]">
        <Skeleton className="h-8 w-72 max-w-full" />
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </SkeletonScreen>
  );
}
