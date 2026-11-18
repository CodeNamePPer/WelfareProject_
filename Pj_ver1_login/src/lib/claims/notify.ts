import "server-only";
import { emailEmployees, emailRole, type NoticeMessage } from "@/lib/email/notify";
import { emailHr, isHrEmployee } from "@/lib/hr/emailNotify";
import { payDateOf, thaiDate } from "./requester";
import type { ClaimEventKind, ClaimRecord } from "./types";

// อีเมลเรื่องคำขอเบิกสวัสดิการ ทุกเหตุการณ์ใน welfare_claim_event ที่มีคนต้องรู้หรือต้องทำต่อ
//   ผู้ขอ (เจ้าของ + ผู้ยื่นแทน)  สถานะคำขอของตัวเองทุกขั้น
//   การเงิน                       คำขอที่ HR อนุมัติแล้วรอจ่าย จ่ายเพิ่ม/เงินคืนของเบิกล่วงหน้า
//   HR                            คำขอที่การเงินส่งกลับ (ยื่นใหม่และใบเสร็จส่งจากจุดที่ยื่นเอง)

const money = (value: number) => `${value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

const requesterPath = (claim: ClaimRecord) => `/employee/status?id=${encodeURIComponent(claim.claimNo)}`;

/** เหตุการณ์ที่ผู้ทำเองก็ได้อีเมลยืนยันด้วย (ยื่นคำขอ ส่งใบเสร็จ) */
const RECEIPT_KINDS: ClaimEventKind[] = ["submitted", "resubmitted", "receipt_submitted"];

function requesterMessage(claim: ClaimRecord, kind: ClaimEventKind, note: string | null): NoticeMessage | null {
  const head = `${claim.claimNo} · ${claim.benefitName}`;
  const amount = claim.amountApproved ?? claim.amountRequested;
  const payDate = payDateOf(claim);
  const proxy = claim.submittedByCode !== claim.employeeCode ? `${claim.submittedByName} ยื่นแทน ${claim.employeeName}` : null;
  const noteLine = (label: string) => (note ? [`${label}: ${note}`] : []);
  const advance = claim.advance;
  const path = requesterPath(claim);
  const build = (subject: string, ...lines: (string | null | false | undefined)[]): NoticeMessage => ({
    subject,
    lines: [head, ...lines.filter((line): line is string => Boolean(line))],
    path,
  });

  switch (kind) {
    case "submitted":
      return build(`ได้รับคำขอ ${claim.claimNo} แล้ว`, `ยอดขอเบิก ${money(claim.amountRequested)}${claim.isAdvance ? " · เบิกล่วงหน้า" : ""}`, proxy, "ขั้นต่อไป: HR ตรวจสอบเอกสาร");
    case "resubmitted":
      return build(`ส่งคำขอ ${claim.claimNo} ที่แก้ไขแล้ว`, `ยอดขอเบิก ${money(claim.amountRequested)}`, proxy, "ขั้นต่อไป: HR ตรวจสอบอีกครั้ง");
    case "hr_approved":
      return build(
        `HR อนุมัติคำขอ ${claim.claimNo} แล้ว`,
        `ยอดอนุมัติ ${money(amount)}${claim.amountApproved !== null && claim.amountApproved !== claim.amountRequested ? ` (ขอ ${money(claim.amountRequested)})` : ""}`,
        ...noteLine("หมายเหตุ"),
        "ขั้นต่อไป: การเงินตรวจก่อนจ่าย",
      );
    case "revision_requested":
      return build(`คำขอ ${claim.claimNo} ต้องแก้ไข`, ...noteLine("สิ่งที่ต้องแก้"), "แก้ไขแล้วส่งกลับได้ที่หน้าติดตามสถานะ");
    case "rejected":
      return build(`คำขอ ${claim.claimNo} ไม่ได้รับอนุมัติ`, ...noteLine("เหตุผล"));
    case "finance_approved":
      return build(`การเงินอนุมัติจ่ายคำขอ ${claim.claimNo}`, `ยอดจ่าย ${money(amount)}`, payDate && `กำหนดโอน ${thaiDate(payDate)}`);
    case "paid":
      return build(
        `โอนเงินคำขอ ${claim.claimNo} แล้ว`,
        `ยอดโอน ${money(amount)}`,
        claim.payment && `บัญชี ${claim.payment.bankCode} ${claim.payment.accountMasked}${claim.payment.transferRef ? ` · เลขอ้างอิง ${claim.payment.transferRef}` : ""}`,
        advance && `เบิกล่วงหน้า: แนบใบเสร็จจริงภายใน ${thaiDate(advance.receiptDueDate)}`,
      );
    case "payment_failed":
      return build(`โอนเงินคำขอ ${claim.claimNo} ไม่สำเร็จ`, ...noteLine("รายละเอียด"), "การเงินจะโอนใหม่ในรอบถัดไป ตรวจบัญชีธนาคารในโปรไฟล์ให้ถูกต้อง");
    case "pay_date_changed":
      return build(`เปลี่ยนวันจ่ายคำขอ ${claim.claimNo}`, payDate && `กำหนดโอนใหม่ ${thaiDate(payDate)}`, ...noteLine("เหตุผล"));
    case "cancelled":
      return build(`ยกเลิกคำขอ ${claim.claimNo} แล้ว`, proxy, ...noteLine("หมายเหตุ"));
    case "receipt_submitted":
      return build(`ได้รับใบเสร็จของคำขอ ${claim.claimNo} แล้ว`, advance?.receiptAmount != null && `ยอดตามใบเสร็จ ${money(advance.receiptAmount)}`, "ขั้นต่อไป: HR ตรวจใบเสร็จ");
    case "receipt_approved": {
      const settle =
        advance?.settlement === "extra_payment"
          ? `อนุมัติจ่ายเพิ่ม ${money(advance.extraAmountApproved ?? 0)} การเงินจะโอนให้ตามรอบ`
          : advance?.settlement === "refund"
            ? `ต้องคืนส่วนต่าง ${money(advance.refundAmount ?? 0)} ให้ฝ่ายการเงิน`
            : "ยอดตรงกับเงินล่วงหน้า ปิดรายการแล้ว";
      return build(`HR ตรวจใบเสร็จคำขอ ${claim.claimNo} แล้ว`, settle, ...noteLine("หมายเหตุ"));
    }
    case "receipt_returned":
      return build(`ใบเสร็จคำขอ ${claim.claimNo} ต้องแนบใหม่`, ...noteLine("สิ่งที่ต้องแก้"), advance && `แนบใหม่ภายใน ${thaiDate(advance.receiptDueDate)}`);
    case "advance_cancelled":
      return build(`ยกเลิกเงินล่วงหน้าคำขอ ${claim.claimNo}`, advance && `ต้องคืนเงิน ${money(advance.refundAmount ?? advance.advanceAmount)} ให้ฝ่ายการเงิน`, ...noteLine("เหตุผล"));
    case "refund_received":
      return build(`การเงินรับเงินคืนคำขอ ${claim.claimNo} แล้ว`, ...noteLine("รายละเอียด"));
    default:
      return null;
  }
}

function financeMessage(claim: ClaimRecord, kind: ClaimEventKind): NoticeMessage | null {
  const head = `${claim.claimNo} · ${claim.benefitName} · ${claim.employeeName}`;
  const advance = claim.advance;
  if (kind === "hr_approved") {
    return { subject: `คำขอ ${claim.claimNo} รอการเงินอนุมัติจ่าย`, lines: [head, `ยอดที่ HR อนุมัติ ${money(claim.amountApproved ?? claim.amountRequested)}${claim.isAdvance ? " · เบิกล่วงหน้า" : ""}`], path: `/payroll/approvals/${encodeURIComponent(claim.claimNo)}` };
  }
  if (kind === "receipt_approved" && advance?.settlement === "extra_payment") {
    return { subject: `เบิกล่วงหน้า ${claim.claimNo}: อนุมัติจ่ายเพิ่ม`, lines: [head, `จ่ายเพิ่ม ${money(advance.extraAmountApproved ?? 0)}`], path: "/payroll/advances" };
  }
  if ((kind === "receipt_approved" && advance?.settlement === "refund") || kind === "advance_cancelled") {
    return { subject: `เบิกล่วงหน้า ${claim.claimNo}: มียอดรอรับคืน`, lines: [head, `ยอดรอรับคืน ${money(advance?.refundAmount ?? advance?.advanceAmount ?? 0)}`], path: "/payroll/refunds" };
  }
  return null;
}

/** ส่งอีเมลของเหตุการณ์นี้ claim คือข้อมูลหลังบันทึกแล้ว · actorCode null = ระบบทำเอง */
export async function sendClaimNotices(claim: ClaimRecord, kind: ClaimEventKind, actorCode: string | null, note: string | null) {
  const requester = requesterMessage(claim, kind, note);
  if (requester) {
    const exclude = RECEIPT_KINDS.includes(kind) || !actorCode ? [] : [actorCode];
    emailEmployees(`claim:${kind}`, [claim.employeeCode, claim.submittedByCode], requester, { exclude, topic: "my_claim_status" });
  }

  const finance = financeMessage(claim, kind);
  if (finance) emailRole(`finance:${kind}`, "FINANCE", finance, { exclude: [claim.employeeCode, ...(actorCode ? [actorCode] : [])] });

  // การเงินส่งกลับ: คำขอกลับเข้าคิว HR
  if (kind === "returned") {
    const message: NoticeMessage = {
      subject: `การเงินส่งคำขอ ${claim.claimNo} กลับให้ HR ตรวจ`,
      lines: [`${claim.claimNo} · ${claim.benefitName} · ${claim.employeeName}`, ...(note ? [`เหตุผล: ${note}`] : [])],
      path: `/hr/home/requests/${encodeURIComponent(claim.claimNo)}`,
    };
    const exclude = [claim.employeeCode, claim.submittedByCode];
    emailHr("claim_new", message, { exclude });
    if (await isHrEmployee(claim.employeeCode).catch(() => false)) emailHr("hr_claim_pending", message, { only: "hr_head", exclude });
  }
}
