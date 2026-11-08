import type { ComponentProps, ReactNode } from "react";

type Align = "left" | "right" | "center";
// เขียน class เต็มๆ ไว้ ห้ามต่อสตริงเอง เช่น "text-" + align เพราะ Tailwind จะหา class ไม่เจอตอน build
const ALIGN: Record<Align, string> = { left: "text-left", right: "text-right", center: "text-center" };

/*
 * ชิ้นส่วนตารางตาม Style Guide ข้อ 4:
 *   หัวตารางพื้น surface, แถวสูง 52px, hover พื้น primary-50
 *   จอเล็กให้ "ตาราง" เลื่อนแนวนอนในกรอบ ไม่ให้ทั้งหน้าเลื่อน (overflow-x-auto)
 */

/**
 * bare    = ไม่มีกรอบ/มุมโค้งของตัวเอง ใช้เมื่อวางอยู่ใน <ListPanel> (ตารางชนขอบการ์ด)
 * compact = ตารางคอลัมน์น้อย ไม่ต้องบังคับกว้างขั้นต่ำ 720px
 */
export function TableContainer({ children, bare = false, compact = false }: { children: ReactNode; bare?: boolean; compact?: boolean }) {
  return (
    <div className={`relative overflow-x-auto ${bare ? "border-y border-line" : "rounded-xl border border-line"}`}>
      <table className={`w-full border-collapse text-left text-12 ${compact ? "" : "min-w-[720px]"}`}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-surface text-muted">
      <tr className="border-b border-line">{children}</tr>
    </thead>
  );
}

/** หัวคอลัมน์  align="right" สำหรับคอลัมน์ตัวเลขเงิน */
export function Th({ children, align = "left", className = "", ...rest }: ComponentProps<"th"> & { align?: Align }) {
  return (
    <th scope="col" className={`h-11 px-4 font-medium md:first:pl-5 md:last:pr-5 whitespace-nowrap ${ALIGN[align]} ${className}`} {...rest}>
      {children}
    </th>
  );
}

/**
 * selected = ติ๊กเลือกอยู่,  active = แถวที่กำลังเปิดดูรายละเอียด
 * onActivate = คลิกตรงไหนของแถวก็ได้ (ยกเว้นปุ่ม/ลิงก์/checkbox ในแถว) เพื่อเปิดรายละเอียด
 */
export function Tr({
  children,
  selected = false,
  active = false,
  onActivate,
}: {
  children: ReactNode;
  selected?: boolean;
  active?: boolean;
  onActivate?: () => void;
}) {
  const tone = selected ? "bg-primary-100/60" : active ? "bg-primary-50" : "hover:bg-primary-50";
  return (
    <tr
      aria-current={active || undefined}
      onClick={
        onActivate
          ? (e) => {
              // คลิกโดนปุ่ม/ลิงก์/checkbox ในแถว ให้ทำงานของปุ่มนั้นอย่างเดียว
              if ((e.target as HTMLElement).closest("button, a, input, label, select, textarea")) return;
              onActivate();
            }
          : undefined
      }
      className={`h-[52px] border-b border-line last:border-b-0 transition-colors ${tone} ${onActivate ? "cursor-pointer" : ""}`}
    >
      {children}
    </tr>
  );
}

export function Td({ children, align = "left", className = "", ...rest }: ComponentProps<"td"> & { align?: Align }) {
  return (
    <td className={`px-4 py-2 whitespace-nowrap md:first:pl-5 md:last:pr-5 text-ink ${ALIGN[align]} ${className}`} {...rest}>
      {children}
    </td>
  );
}

/** แถวพิเศษกินเต็มความกว้าง ใช้แสดง Empty state ในตาราง */
export function TdFull({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="whitespace-normal">
        {children}
      </td>
    </tr>
  );
}
