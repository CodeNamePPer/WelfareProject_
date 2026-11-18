import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "@/lib/supabase";
import { PHOTO_URL_PREFIX, readPhoto } from "@/lib/employee/photo";

// รูปโปรไฟล์บนตัวเลือกบัญชีหน้า login (ยังไม่ได้ล็อกอิน เปิด /api/photos ไม่ได้)
// เครื่องที่เคยเข้าสู่ระบบด้วยบัญชีนั้นจะได้ "กุญแจรูป" ที่เซ็นด้วย AUTH_SECRET ไว้ใน localStorage
// กุญแจเปิดได้แค่รูปของบัญชีนั้นบัญชีเดียว ใช้ทำอย่างอื่นไม่ได้ (ไม่ใช่ session)

const PURPOSE = "account-photo";
const TOKEN_TTL = "365d";
const SEED_AVATAR = /^\/avatars\/E\d{5}\.(jpg|png|svg)$/;
const SEED_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET ต้องกำหนดและยาวอย่างน้อย 32 ตัวอักษร");
  return new TextEncoder().encode(secret);
}

export async function createAccountPhotoToken(code: string): Promise<string> {
  return new SignJWT({ purpose: PURPOSE }).setProtectedHeader({ alg: "HS256" }).setSubject(code).setIssuedAt().setExpirationTime(TOKEN_TTL).sign(key());
}

/** คืน employee_code ของกุญแจ หรือ null ถ้ากุญแจไม่ถูกต้อง/หมดอายุ */
export async function verifyAccountPhotoToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.purpose === PURPOSE && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

/** รูปโปรไฟล์ปัจจุบันของพนักงาน (รูปที่อัปโหลดเอง หรือรูปตั้งต้นใน public/avatars) */
export async function readCurrentPhoto(code: string): Promise<{ body: Blob | Buffer; type: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("employee")
    .select("photo_url")
    .eq("employee_code", code)
    .is("deleted_at", null)
    .maybeSingle<{ photo_url: string | null }>();
  if (error || !data?.photo_url) return null;
  const url = data.photo_url;

  if (url.startsWith(PHOTO_URL_PREFIX)) {
    const blob = await readPhoto(url.slice(PHOTO_URL_PREFIX.length));
    return blob ? { body: blob, type: blob.type || "application/octet-stream" } : null;
  }
  if (SEED_AVATAR.test(url)) {
    try {
      const body = await readFile(path.join(process.cwd(), "public", url));
      return { body, type: SEED_TYPES[path.extname(url)] };
    } catch {
      return null;
    }
  }
  return null;
}
