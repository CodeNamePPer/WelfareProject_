const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * อีเมลติดต่อที่ส่งได้จริง (บัญชีที่ไม่มีอีเมลระบบตั้งเป็น ...@no-email.invalid)
 * ใช้ทั้งฝั่ง API และหน้าจอ admin เพื่อให้ข้อความก่อนรีเซ็ตตรงกับสิ่งที่ server จะทำจริง
 */
export function deliverableEmail(email: string | null | undefined): string | null {
  const value = email?.trim() ?? "";
  return EMAIL_RE.test(value) && !value.toLowerCase().endsWith(".invalid") ? value : null;
}

/** เหตุที่แสดงรหัสชั่วคราวบนจอแทนการส่งอีเมล: สองแบบแรกรู้ล่วงหน้า (บอกไว้ก่อนยืนยัน) แบบสุดท้ายคือส่งพลาดจริง */
export type ResetFallback = "no-email" | "not-configured" | "send-failed";

/** สถานะการส่งอีเมลของระบบ ส่งจาก server ไปให้หน้าจอ admin (ไม่มีคีย์หรือความลับ) */
export type EmailDelivery = {
  /** ตั้งค่า RESEND_API_KEY แล้ว */
  configured: boolean;
  /** ช่วงทดสอบ: ทุกฉบับส่งไปที่อีเมลนี้แทนผู้รับจริง */
  testTo: string | null;
};
