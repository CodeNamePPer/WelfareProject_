// ชนิดข้อมูล (TypeScript types) ที่ใช้ร่วมกันทุกหน้า

/** ประเภทสวัสดิการ */
export type WelfareType = "medical" | "education" | "dental" | "self_dev" | "accident";

/** สถานะของคำขอเบิก/การจ่ายเงิน */
export type PaymentStatus = "draft" | "review" | "approved" | "pending" | "returned" | "paid";

/** รอบจ่าย: รอบที่ 1 = วันที่ 1–15, รอบที่ 2 = วันที่ 16–สิ้นเดือน */
export type RoundNo = 1 | 2;

/** คำขอเบิกสวัสดิการ 1 รายการ (ข้อมูลที่ฝ่ายการเงินต้องใช้) */
export interface PaymentRequest {
  id: string; // เลขที่คำขอ เช่น REQ2026001
  employeeId: string; // รหัสพนักงาน เช่น EMP001
  employeeName: string;
  department: string;
  welfare: WelfareType;
  amount: number; // ยอดเบิก
  paidAmount: number; // จ่ายจริง
  requestDate: string; // วันที่ยื่นคำขอ (ISO)
  payDate: string; // กำหนดจ่าย / วันที่จ่ายจริง (ISO)
  round: RoundNo;
  status: PaymentStatus;
  returnReason?: string; // เหตุผลที่ส่งกลับ (มีเมื่อ status = returned)

  // รายละเอียดเอกสาร (ใช้ในหน้า "ข้อมูลเพิ่มเติม")
  receiptNo: string;
  approvalNo: string;
  hospital: string;
  treatmentDate: string;
  receiptDate: string;
  submitter: string;
  receiptIssuer: string;
  accountingRef: string;
  approvedDate: string;
  approver: string;
  payer: string;
  bankAccount: string; // แสดงแบบปิดบัง เช่น xxx-xxx-7890
}

/** รอบจ่าย 1 รอบในเดือนหนึ่ง แยกตามประเภทสวัสดิการ */
export interface PayRound {
  id: string;
  round: RoundNo;
  year: number;
  month: number; // 1-12
  welfare: WelfareType;
  payDate: string;
  status: PaymentStatus;
}

/** บทบาทผู้ใช้ (Style Guide ข้อ 5) */
export type Role = "employee" | "manager" | "hr" | "admin" | "finance";
