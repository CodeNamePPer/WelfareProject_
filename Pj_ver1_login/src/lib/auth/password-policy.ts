/** นโยบายรหัสผ่าน ใช้ร่วมกันทั้งฟอร์ม (client) และ API (server) */
export const PASSWORD_MIN = 8;
/** bcrypt ใช้แค่ 72 ไบต์แรก ส่วนที่เกินถูกตัดทิ้งเงียบ ๆ จึงจำกัดรหัสใหม่ไว้ที่ 72 ไบต์ (ภาษาไทย 1 ตัว = 3 ไบต์) */
export const PASSWORD_MAX_BYTES = 72;
/** จำนวนตัวอักษรสูงสุดของช่องรหัสใหม่ (ตัวอักษรอังกฤษ 1 ตัว = 1 ไบต์) */
export const PASSWORD_MAX = PASSWORD_MAX_BYTES;
/** ช่องรหัสผ่านปัจจุบัน: รับยาวกว่าได้ เผื่อรหัสเดิมที่ตั้งไว้ก่อนมีเพดาน 72 ไบต์ */
export const CURRENT_PASSWORD_MAX = 200;

const byteLength = (text: string) => new TextEncoder().encode(text).length;
// ตัวอักษร = A–Z และพยัญชนะ/สระ/วรรณยุกต์ไทย (ไม่นับ ฿ U+0E3F และเลขไทย U+0E50–0E59)
const HAS_LETTER = /[A-Za-z\u0E01-\u0E3A\u0E40-\u0E4E]/;
// ตัวเลข = 0–9 และเลขไทย
const HAS_DIGIT = /[0-9๐-๙]/;

export const PASSWORD_RULES = [
  `อย่างน้อย ${PASSWORD_MIN} ตัวอักษร`,
  "มีทั้งตัวอักษรและตัวเลข",
  "ไม่มีรหัสพนักงานหรือชื่อล็อกอินอยู่ในรหัส",
];

/** ผ่านเงื่อนไขข้อไหนบ้าง (ลำดับเดียวกับ PASSWORD_RULES) ใช้แสดงติ๊กถูกสดๆ ในฟอร์ม */
export function passwordRuleStatus(password: string, account: { employeeId: string; loginName: string }): boolean[] {
  const lower = password.toLowerCase();
  const loginLocal = account.loginName.toLowerCase().split("@")[0];
  const banned = [account.employeeId.toLowerCase(), loginLocal].filter((s) => s.length >= 3);
  return [
    password.length >= PASSWORD_MIN && byteLength(password) <= PASSWORD_MAX_BYTES,
    HAS_LETTER.test(password) && HAS_DIGIT.test(password),
    password.length > 0 && !banned.some((s) => lower.includes(s)),
  ];
}

/** คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
export function checkNewPassword(password: string, account: { employeeId: string; loginName: string }): string | null {
  if (password.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`;
  if (byteLength(password) > PASSWORD_MAX_BYTES) return `รหัสผ่านยาวเกินไป (ไม่เกิน ${PASSWORD_MAX_BYTES} ตัวอักษรภาษาอังกฤษ หรือ 24 ตัวอักษรภาษาไทย)`;
  if (!HAS_LETTER.test(password) || !HAS_DIGIT.test(password)) return "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข";

  const lower = password.toLowerCase();
  const loginLocal = account.loginName.toLowerCase().split("@")[0];
  const banned = [account.employeeId.toLowerCase(), loginLocal].filter((s) => s.length >= 3);
  if (banned.some((s) => lower.includes(s))) return "รหัสผ่านต้องไม่มีรหัสพนักงานหรือชื่อล็อกอินอยู่ในรหัส";
  return null;
}
