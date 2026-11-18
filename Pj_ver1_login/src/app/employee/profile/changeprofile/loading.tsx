import Link from "next/link";
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHead, Sheet, pill } from "@/features/requester/ui";

export default function ChangeProfileLoading() {
  return (
    <SkeletonScreen className="mx-auto max-w-[1160px] group-data-[nav=collapsed]/shell:max-w-none px-1 pb-8 pt-2 text-13 text-ink">
      <div className="mx-auto grid max-w-[720px] gap-5">
        <PageHead
          crumbs={[
            { label: "พนักงาน", href: "/employee/profile" },
            { label: "โปรไฟล์ของฉัน", href: "/employee/profile" },
            { label: "ยื่นคำขอเปลี่ยนข้อมูล" },
          ]}
          title="ยื่นคำขอเปลี่ยนข้อมูล"
          description="ฝ่ายบุคคลจะตรวจสอบก่อนเปลี่ยนข้อมูลในโปรไฟล์ · ช่องที่มี * จำเป็นต้องกรอก"
        >
          <Link href="/employee/profile" className={pill.quiet}>
            กลับไปโปรไฟล์
          </Link>
        </PageHead>

        <Sheet className="divide-y divide-line">
          <div className="grid gap-4 p-5">
            <h2 className="text-15 font-semibold text-ink">ข้อมูลที่ขอเปลี่ยน</h2>
            <Skeleton className="h-[42px] w-full rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-[42px] w-full rounded-lg" />
              <Skeleton className="h-[42px] w-full rounded-lg" />
            </div>
            <Skeleton className="h-[88px] w-full rounded-lg" />
          </div>
          <div className="grid gap-3 p-5">
            <h2 className="text-15 font-semibold text-ink">หลักฐานประกอบคำขอ</h2>
            <Skeleton className="min-h-24 w-full rounded-lg" />
          </div>
          <div className="grid gap-4 p-5">
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-[38px] w-full rounded-full" />
          </div>
        </Sheet>
      </div>
    </SkeletonScreen>
  );
}
