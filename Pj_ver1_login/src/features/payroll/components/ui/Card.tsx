import type { ReactNode } from "react";

/*
 * ชิ้นส่วนจัดวาง (layout primitives)
 * จังหวะระยะห่างทั้งระบบ (ฐาน 4px):
 *   ภายในกลุ่ม  = 12–16px  (gap-3 / gap-4)
 *   ระหว่างกลุ่ม = 32px     (gap-8)  ← ใช้ใน <PageStack>
 */

/** การ์ดพื้นขาว มุม 12px เงาบาง (Style Guide ข้อ 3) */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-line bg-white shadow-card ${className}`}>{children}</section>;
}

/** เรียงส่วนต่างๆ ของหน้าจากบนลงล่าง เว้น 32px ระหว่างกลุ่ม */
export function PageStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-8">{children}</div>;
}

/**
 * กรอบของหน้ารายการ: รวม "หัวข้อ + ปุ่ม Export / ตัวกรอง / ตาราง / แบ่งหน้า" ไว้เป็นก้อนเดียว
 * เพราะทั้งหมดทำงานกับข้อมูลชุดเดียวกัน (ตัวกรองกำหนดว่าตารางแสดงอะไร)
 *
 *   title    – หัวข้อของรายการ (ไม่บังคับ ถ้าหัวหน้าเพจบอกอยู่แล้ว)
 *   lead     – ของที่อยู่ซ้ายบน แทนหัวข้อ เช่น แท็บ
 *   actions  – ปุ่มมุมขวาบนของรายการ (ไม่บังคับ)
 *   toolbar  – แถวตัวกรอง
 *   children – ตาราง (ใช้ <TableContainer bare> ให้ตารางชนขอบการ์ด)
 *   footer   – แถบแบ่งหน้า <Pagination>
 */
export function ListPanel({
  title,
  lead,
  actions,
  toolbar,
  children,
  footer,
}: {
  title?: string;
  lead?: ReactNode;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const hasHeader = title || lead || actions;
  return (
    <Card>
      {(hasHeader || toolbar) && (
        <div className="flex flex-col gap-4 p-4 md:p-5">
          {hasHeader && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              {title ? <h2 className="text-14 font-semibold text-ink">{title}</h2> : lead}
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
          )}
          {toolbar}
        </div>
      )}
      {children}
      {footer && <div className="px-4 pb-4 md:px-5">{footer}</div>}
    </Card>
  );
}

/**
 * แถบตัวเลขสรุป: หลายตัวเลขในกรอบเดียว คั่นด้วยเส้น
 * (แทนการ์ดแยกกันหลายใบที่น้ำหนักเท่ากันหมด)
 */
export function SummaryStrip({ items, className = "" }: { items: { label: string; value: ReactNode; note?: ReactNode; tone?: string }[]; className?: string }) {
  return (
    <dl className={`grid divide-y divide-line rounded-xl border border-line bg-white sm:grid-cols-3 sm:divide-x sm:divide-y-0 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-1 px-5 py-4">
          <dt className="text-12 text-muted">{it.label}</dt>
          <dd className={`num text-17 font-semibold ${it.tone ?? "text-ink"}`}>{it.value}</dd>
          {it.note && <dd className="text-12 text-muted">{it.note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** การ์ดตัวเลขสรุปใบเดียว (ใช้เป็นข้อมูลรอง) */
export function StatCard({ label, value, note, children }: { label: string; value: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <p className="text-12 text-muted">{label}</p>
      <p className="num text-17 font-semibold text-ink">{value}</p>
      {note && <p className="text-12 text-muted">{note}</p>}
      {children}
    </Card>
  );
}
