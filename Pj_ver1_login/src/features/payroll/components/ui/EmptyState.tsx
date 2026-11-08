import { Icon } from "./Icon";

/** สถานะว่าง: แสดงเมื่อไม่มีข้อมูลหรือค้นหาไม่เจอ (Style Guide ข้อ 6.1) */
export function EmptyState({
  title = "ไม่พบรายการ",
  description = "ลองเปลี่ยนคำค้นหาหรือตัวกรอง",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-primary-50 text-primary-600">
        <Icon name="inbox" className="size-6" />
      </span>
      <p className="text-13 font-medium text-ink">{title}</p>
      <p className="text-12 text-muted">{description}</p>
    </div>
  );
}
