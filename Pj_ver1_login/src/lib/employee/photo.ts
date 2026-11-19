import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// รูปโปรไฟล์ที่พนักงานอัปโหลดเอง ไฟล์อยู่ใน bucket ส่วนตัว employee-photos
// employee.photo_url = /api/photos/{path} (route นั้นเปิดได้เฉพาะผู้ที่ล็อกอินแล้ว)

const PHOTO_BUCKET = "employee-photos";
export const PHOTO_URL_PREFIX = "/api/photos/";
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
/** {employee uuid}/{uuid}.{ext} */
const PHOTO_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/** ตรวจลายเซ็นไฟล์จริง (magic bytes) – photo.type มาจากผู้ใช้ จึงปลอมเป็นรูปได้ */
function sniffImageType(head: Uint8Array): string | null {
  const starts = (...bytes: number[]) => bytes.every((byte, i) => head[i] === byte);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  // RIFF....WEBP
  if (starts(0x52, 0x49, 0x46, 0x46) && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) return "image/webp";
  return null;
}

export class PhotoError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** อัปโหลดรูปโปรไฟล์ใหม่ของตัวเอง แทนรูปเดิมทันที (ไม่ต้องรอ HR อนุมัติ) คืน photo_url ใหม่ */
export async function uploadOwnPhoto(code: string, photo: File): Promise<string> {
  const ext = PHOTO_TYPES[photo.type];
  if (!ext) throw new PhotoError("รูปต้องเป็น JPG, PNG หรือ WebP");
  if (photo.size > PHOTO_MAX_BYTES) throw new PhotoError("รูปมีขนาดเกิน 5 MB");
  if (sniffImageType(new Uint8Array(await photo.slice(0, 12).arrayBuffer())) !== photo.type) {
    throw new PhotoError("ไฟล์นี้ไม่ใช่รูป JPG, PNG หรือ WebP ที่ถูกต้อง");
  }

  const { data: me, error } = await supabaseAdmin
    .from("employee")
    .select("id, photo_url")
    .eq("employee_code", code)
    .is("deleted_at", null)
    .maybeSingle<{ id: string; photo_url: string | null }>();
  if (error) throw error;
  if (!me) throw new PhotoError("ไม่พบข้อมูลพนักงาน", 404);

  const path = `${me.id}/${crypto.randomUUID()}${ext}`;
  const { error: uploadError } = await supabaseAdmin.storage.from(PHOTO_BUCKET).upload(path, photo, { contentType: photo.type });
  if (uploadError) throw uploadError;

  const photoUrl = `${PHOTO_URL_PREFIX}${path}`;
  const { error: updateError } = await supabaseAdmin.from("employee").update({ photo_url: photoUrl }).eq("id", me.id);
  if (updateError) {
    await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([path]);
    throw updateError;
  }

  // ลบรูปที่อัปโหลดไว้ก่อนหน้า (รูปตั้งต้นใน public/avatars ไม่ได้อยู่ใน bucket จึงไม่ต้องลบ)
  const oldPath = me.photo_url?.startsWith(PHOTO_URL_PREFIX) ? me.photo_url.slice(PHOTO_URL_PREFIX.length) : null;
  if (oldPath && oldPath !== path) {
    const { error: removeError } = await supabaseAdmin.storage.from(PHOTO_BUCKET).remove([oldPath]);
    if (removeError) console.error("[employee photo] remove old photo failed", removeError);
  }
  return photoUrl;
}

/** อ่านไฟล์รูปจาก bucket (null = path ไม่ถูกต้องหรือไม่มีไฟล์) */
export async function readPhoto(path: string): Promise<Blob | null> {
  if (!PHOTO_PATH.test(path)) return null;
  const { data, error } = await supabaseAdmin.storage.from(PHOTO_BUCKET).download(path);
  if (error) return null;
  return data;
}
