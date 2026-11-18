/**
 * บัญชีที่เคยเข้าสู่ระบบในเครื่องนี้ (ตัวเลือกบัญชีบนหน้า login)
 * เก็บใน localStorage เฉพาะข้อมูลแสดงผล + ชื่อที่ใช้ล็อกอิน — ไม่มีรหัสผ่านหรือ token
 * การเข้าสู่ระบบยังต้องผ่านรหัสผ่าน + reCAPTCHA + rate-limit ตามปกติทุกครั้ง
 */
import { ROLES, type Role } from "./roles";

export interface KnownAccount {
  /** employee_code – ใช้เป็น key กันบัญชีซ้ำ */
  code: string;
  /** ชื่อที่ใช้ล็อกอิน (อีเมล/username) ส่งไปเป็น identifier */
  login: string;
  name: string;
  role: Role;
  lastUsedAt: number;
  /** กุญแจเปิดรูปโปรไฟล์ของบัญชีนี้บนหน้า login (/api/auth/account-photo/{photoToken}) */
  photoToken?: string;
}

const PHOTO_TOKEN = /^[\w-]+\.[\w-]+\.[\w-]+$/;
const isPhotoToken = (v: unknown) => v === undefined || (typeof v === "string" && v.length <= 1000 && PHOTO_TOKEN.test(v));

const STORAGE_KEY = "welfare.knownAccounts.v1";
const MAX_ACCOUNTS = 5;

function isKnownAccount(v: unknown): v is KnownAccount {
  if (!v || typeof v !== "object") return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.code === "string" &&
    typeof a.login === "string" &&
    a.login.length > 0 &&
    a.login.length <= 200 &&
    typeof a.name === "string" &&
    typeof a.lastUsedAt === "number" &&
    isPhotoToken(a.photoToken) &&
    (ROLES as readonly string[]).includes(a.role as string)
  );
}

export function readKnownAccounts(): KnownAccount[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isKnownAccount)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, MAX_ACCOUNTS);
  } catch {
    // localStorage ถูกปิด (โหมดส่วนตัวบางเบราว์เซอร์) หรือข้อมูลเสีย → ทำเหมือนไม่มีบัญชี
    return [];
  }
}

function write(list: KnownAccount[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* เก็บไม่ได้ก็ไม่เป็นไร – แค่ไม่มีตัวเลือกบัญชีครั้งหน้า */
  }
}

export function rememberAccount(account: Omit<KnownAccount, "lastUsedAt">): void {
  if (!isKnownAccount({ ...account, lastUsedAt: 0 })) return;
  const rest = readKnownAccounts().filter((a) => a.code !== account.code);
  write([{ ...account, lastUsedAt: Date.now() }, ...rest].slice(0, MAX_ACCOUNTS));
}

/**
 * ต่ออายุกุญแจรูปของบัญชีที่จำไว้ในเครื่องแล้ว (เรียกจากทุกหน้าหลังล็อกอิน)
 * ไม่เพิ่มบัญชีใหม่ ผู้ที่ไม่ติ๊ก "จดจำบัญชี" จึงไม่ถูกเก็บ
 */
export function rememberPhotoToken(code: string, photoToken: string): void {
  if (!isPhotoToken(photoToken)) return;
  const list = readKnownAccounts();
  if (!list.some((a) => a.code === code && a.photoToken !== photoToken)) return;
  write(list.map((a) => (a.code === code ? { ...a, photoToken } : a)));
}

export function forgetAccount(code: string): KnownAccount[] {
  const next = readKnownAccounts().filter((a) => a.code !== code);
  write(next);
  return next;
}

const LEADING_VOWELS = /^[เแโใไ]/;
const TITLES = /^(นาย|นางสาว|นาง|น\.ส\.|ดร\.|mr\.?|mrs\.?|ms\.?|miss)\s*/i;

/** ตัวย่อชื่อ 2 ตัวอักษร เช่น "สมชาย ใจดี" → "สจ", "เกศินี ไชยา" → "กช" */
export function initialsOf(name: string): string {
  const parts = name.trim().replace(TITLES, "").split(/\s+/).filter(Boolean);
  const first = (p: string) => p.replace(LEADING_VOWELS, "").charAt(0).toUpperCase();
  if (parts.length === 0) return "?";
  if (parts.length === 1) return first(parts[0]);
  return first(parts[0]) + first(parts[parts.length - 1]);
}

const AVATAR_TONES = ["bg-[#2c3e66]", "bg-ok", "bg-stamp-dark"] as const;

/** สีพื้นวงกลมตัวย่อ คงที่ต่อบัญชี */
export function avatarTone(code: string): string {
  let h = 0;
  for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}
