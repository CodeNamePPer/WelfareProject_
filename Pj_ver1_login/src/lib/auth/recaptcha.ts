const VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/** action ที่หน้า Login ส่งมากับ grecaptcha.execute — ต้องตรงกันทั้งสองฝั่ง */
export const RECAPTCHA_LOGIN_ACTION = "login";

/** reCAPTCHA v3 ให้คะแนน 0.0 (บอท) – 1.0 (คน) ต่ำกว่าเกณฑ์นี้ถือว่าไม่ผ่าน */
function minScore(): number {
  const raw = process.env.RECAPTCHA_MIN_SCORE?.trim();
  if (!raw) return 0.5;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.5;
}

interface SiteVerifyV3 {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

export async function verifyRecaptcha(
  token: string | undefined,
  ip: string | null,
  expectedAction: string = RECAPTCHA_LOGIN_ACTION,
): Promise<boolean> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!secret) {
    // ตอนพัฒนายอมให้ข้ามได้ แต่ production ต้องตั้งค่าเสมอ
    return process.env.NODE_ENV !== "production";
  }
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store" });
    const data = (await res.json()) as SiteVerifyV3;

    if (data.success !== true) return false;
    if (data.action !== expectedAction) return false;
    if (typeof data.score !== "number" || data.score < minScore()) return false;
    return true;
  } catch {
    return false;
  }
}
