import { cn } from "@/utils/cn";

// แท่งสีเทาแทนเนื้อหาระหว่างรอข้อมูล
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse motion-reduce:animate-none rounded bg-mist", className)} />;
}

// ห่อทั้งหน้า: แสดงทันที ไม่หน่วง/ไม่ fade-in
// (Next เอาหน้าเดิมออกตั้งแต่เริ่มเปลี่ยนหน้า ถ้าหน่วง skeleton ไว้ ผู้ใช้จะเห็นหน้าว่างแวบหนึ่ง)
export function SkeletonScreen({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    // data-route-loading: ตราบใดที่ยังมี skeleton อยู่ NavigationProgress จะยังไม่จบแถบ
    <div role="status" aria-busy="true" data-route-loading="" className={className}>
      <span className="sr-only">กำลังโหลด...</span>
      {children}
    </div>
  );
}
