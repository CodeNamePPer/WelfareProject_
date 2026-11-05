import { cn } from "@/utils/cn";

// แท่งสีเทาแทนเนื้อหาระหว่างรอข้อมูล
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded bg-mist", className)} />;
}

// ห่อทั้งหน้า: หน่วงก่อนแสดง ถ้าข้อมูลมาเร็วผู้ใช้จะไม่เห็นการกระพริบ (ช่วงนั้นมีแถบโหลดด้านบนบอกอยู่แล้ว)
export function SkeletonScreen({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    // data-route-loading: NavigationProgress รอจนโครงหน้านี้หายก่อนจบแถบ
    <div role="status" aria-busy="true" data-route-loading="" className={cn("animate-skeleton-in", className)}>
      <span className="sr-only">กำลังโหลด...</span>
      {children}
    </div>
  );
}
