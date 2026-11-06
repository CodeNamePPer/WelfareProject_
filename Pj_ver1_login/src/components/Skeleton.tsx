import { cn } from "@/utils/cn";

// แท่งสีเทาแทนเนื้อหาระหว่างรอข้อมูล
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse motion-reduce:animate-none rounded bg-mist", className)} />;
}

// ห่อทั้งหน้า: หน่วงก่อนแสดง ถ้าข้อมูลมาเร็วผู้ใช้จะไม่เห็นการกระพริบ (ช่วงนั้นมีแถบโหลดด้านบนบอกอยู่แล้ว)
export function SkeletonScreen({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    // data-route-loading: ระหว่างหน่วง NavigationProgress ยังไม่จบแถบ
    // animate-skeleton-in: พอเริ่มแสดง (animationstart ชื่อ "skeleton-in") แถบจะจางหายส่งต่อให้โครงหน้า – เปลี่ยนชื่อต้องแก้ใน NavigationProgress ด้วย
    <div role="status" aria-busy="true" data-route-loading="" className={cn("animate-skeleton-in", className)}>
      <span className="sr-only">กำลังโหลด...</span>
      {children}
    </div>
  );
}
