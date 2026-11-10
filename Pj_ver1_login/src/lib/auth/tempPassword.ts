import "server-only";
import { randomInt } from "node:crypto";
import type { ResetFallback } from "../email/address";
import { isEmailConfigured, sendEmail } from "../email/resend";

// ตัดตัวที่อ่านสับสน (0/O, 1/l/I) เพราะ admin ต้องบอกรหัสให้พนักงานด้วยปากหรือกระดาษ
const LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const TEMP_LENGTH = 12;

export function generateTempPassword(): string {
  const all = LETTERS + DIGITS;
  const chars = [LETTERS[randomInt(LETTERS.length)], DIGITS[randomInt(DIGITS.length)]];
  while (chars.length < TEMP_LENGTH) chars.push(all[randomInt(all.length)]);
  // สลับตำแหน่ง ไม่ให้ตัวอักษร/ตัวเลขที่บังคับอยู่ต้นรหัสเสมอ
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

export type TempPasswordDelivery = { emailedTo: string | null; emailError: string | null; fallback: ResetFallback | null };

/** ส่งรหัสทางอีเมลติดต่อของพนักงาน ถ้าส่งไม่ได้ (ไม่มีอีเมล / ยังไม่ตั้งค่า Resend / ส่งพลาด) ผู้เรียกต้องแสดงบนจอแทน */
export async function deliverTempPassword(
  contactEmail: string | null,
  mail: { subject: string; text: string; html: string },
): Promise<TempPasswordDelivery> {
  if (!contactEmail) return { emailedTo: null, emailError: "พนักงานคนนี้ยังไม่มีอีเมลติดต่อ", fallback: "no-email" };
  if (!isEmailConfigured()) return { emailedTo: null, emailError: "ระบบยังไม่ได้ตั้งค่าการส่งอีเมล", fallback: "not-configured" };
  const sent = await sendEmail({ to: contactEmail, ...mail });
  return sent.ok
    ? { emailedTo: sent.deliveredTo, emailError: null, fallback: null }
    : { emailedTo: null, emailError: "ส่งอีเมลไม่สำเร็จ", fallback: "send-failed" };
}
