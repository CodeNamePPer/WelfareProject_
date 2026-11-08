import { StatusBadge } from "@/features/payroll/components/ui/StatusBadge";
import { ROUND_LABEL, WELFARE_LABEL } from "@/features/payroll/lib/constants";
import { formatBaht, formatThaiDate } from "@/features/payroll/lib/format";
import type { PaymentRequest } from "@/features/payroll/lib/types";

/** กล่องย่อย 1 กล่อง: หัวข้อ + รายการ ชื่อ/ค่า */
function InfoBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="px-5 py-4">
      <h3 className="mb-3 text-13 font-semibold text-ink">{title}</h3>
      {/* <dl> = รายการคำ-ความหมาย เหมาะกับข้อมูลแบบ "ชื่อ : ค่า" */}
      <dl className="grid grid-cols-[2fr_3fr] gap-x-3 gap-y-2 text-12">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="num break-words text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface DetailSection {
  title: string;
  rows: [string, string][];
}

/**
 * ข้อมูลรายละเอียดของคำขอ แบ่งเป็นกลุ่ม (ใช้ร่วมกันระหว่างการ์ดนี้ และแผงรายละเอียดด้านขวาในหน้ารายการอนุมัติ)
 * แก้หัวข้อ/แถวที่นี่ที่เดียว ทุกหน้าจะเปลี่ยนตาม
 */
export function detailSections(r: PaymentRequest): DetailSection[] {
  const isMedical = r.welfare === "medical" || r.welfare === "dental" || r.welfare === "accident";
  return [
    {
      title: "รายละเอียดคำขอ",
      rows: [
        ["เลขที่ใบเสร็จ", r.receiptNo],
        ["เลขที่คำขอ", r.id],
        ["เลขที่อนุมัติ", r.approvalNo],
        ["รอบการจ่าย", ROUND_LABEL[r.round]],
        ["ยอดเบิก", formatBaht(r.amount)],
        ["จ่ายจริง", formatBaht(r.paidAmount)],
      ],
    },
    {
      title: isMedical ? "ข้อมูลการรักษา" : "ข้อมูลเอกสาร",
      rows: [
        [isMedical ? "โรงพยาบาล" : "ผู้ให้บริการ", r.hospital],
        [isMedical ? "วันที่รักษา" : "วันที่ใช้บริการ", formatThaiDate(r.treatmentDate)],
        ["วันที่ใบเสร็จ", formatThaiDate(r.receiptDate)],
        ["วันที่ขอ/ส่ง", formatThaiDate(r.requestDate)],
        ["ผู้ส่งคำขอ", r.submitter],
        ["ออกใบเสร็จโดย", r.receiptIssuer],
      ],
    },
    {
      title: "ข้อมูลการเงินบัญชี",
      rows: [
        ["เลขอ้างอิงบัญชี", r.accountingRef],
        ["วันที่อนุมัติ", formatThaiDate(r.approvedDate)],
        [r.status === "paid" ? "วันที่จ่ายเงิน" : "กำหนดจ่าย", formatThaiDate(r.payDate)],
        ["ผู้อนุมัติ", r.approver],
        ["ผู้จ่ายเงิน", r.payer],
        ["บัญชีปลายทาง", r.bankAccount],
      ],
    },
  ];
}

/**
 * การ์ดรายละเอียดการจ่ายเงินของคำขอ 1 รายการ (wireframe Payroll-4, Payroll-5)
 * แบ่ง 3 กลุ่ม: รายละเอียดคำขอ / ข้อมูลการรักษา / ข้อมูลการเงินบัญชี
 * ใช้เส้นคั่นแทนกล่องซ้อนกล่อง ให้ทั้งรายการอ่านเป็นก้อนเดียว
 */
export function PaymentDetailCard({ request: r }: { request: PaymentRequest }) {
  return (
    <article id={r.id} className="scroll-mt-24 rounded-xl border border-line bg-white shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-5 py-3">
        <p className="text-13">
          <span className="font-semibold">ชื่อ {r.employeeName}</span>{" "}
          <span className="text-12 text-muted">
            ({WELFARE_LABEL[r.welfare]} · {r.department})
          </span>
        </p>
        <StatusBadge status={r.status} />
      </header>

      <div className="grid divide-y divide-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {detailSections(r).map((sec) => (
          <InfoBlock key={sec.title} title={sec.title} rows={sec.rows} />
        ))}
      </div>
      {r.returnReason && <p className="mx-5 mb-4 rounded-lg bg-status-rejected/10 px-3 py-2 text-12 text-status-rejected">เหตุผลที่ส่งกลับ: {r.returnReason}</p>}
    </article>
  );
}
