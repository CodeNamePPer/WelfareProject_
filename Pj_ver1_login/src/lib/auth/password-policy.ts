/** นโยบายรหัสผ่าน ใช้ร่วมกันทั้งฟอร์ม (client) และ API (server) */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const PASSWORD_RULES = [
  `อย่างน้อย ${PASSWORD_MIN} ตัวอักษร`,
  "มีทั้งตัวอักษรและตัวเลข",
  "ไม่มีรหัสพนักงานหรือชื่อล็อกอินอยู่ในรหัส",
];

/** คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
export function checkNewPassword(password: string, account: { employeeId: string; loginName: string }): string | null {
  if (password.length < PASSWORD_MIN) return `รหัสผ่านต้องยาวอย่างน้อย ${PASSWORD_MIN} ตัวอักษร`;
  if (password.length > PASSWORD_MAX) return `รหัสผ่านต้องยาวไม่เกิน ${PASSWORD_MAX} ตัวอักษร`;
  if (!/[A-Za-z฀-๿]/.test(password) || !/\d/.test(password)) return "รหัสผ่านต้องมีทั้งตัวอักษรและตัวเลข";

  const lower = password.toLowerCase();
  const loginLocal = account.loginName.toLowerCase().split("@")[0];
  const banned = [account.employeeId.toLowerCase(), loginLocal].filter((s) => s.length >= 3);
  if (banned.some((s) => lower.includes(s))) return "รหัสผ่านต้องไม่มีรหัสพนักงานหรือชื่อล็อกอินอยู่ในรหัส";
  return null;
}
