import "server-only";
import { supabaseAdmin } from "./supabase";

// รูปประกอบสวัสดิการ (welfare_benefit.image_path) อยู่ใน bucket ส่วนตัว จึงต้องออกลิงก์ชั่วคราวทุกครั้งที่แสดง
export const BENEFIT_IMAGE_BUCKET = "welfare-benefit-images";

/** ลิงก์ชั่วคราว 1 ชั่วโมงของรูปหลายรายการในครั้งเดียว คืน Map path → url (path ที่ออกลิงก์ไม่ได้จะไม่อยู่ใน Map) */
export async function signBenefitImages(paths: (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabaseAdmin.storage.from(BENEFIT_IMAGE_BUCKET).createSignedUrls(unique, 60 * 60);
  if (error) {
    console.error("[benefit images] sign failed", error);
    return new Map();
  }
  return new Map((data ?? []).flatMap((row) => (row.path && row.signedUrl ? [[row.path, row.signedUrl] as [string, string]] : [])));
}
