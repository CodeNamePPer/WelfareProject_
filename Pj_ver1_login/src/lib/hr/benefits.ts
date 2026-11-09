import "server-only";
import { getWelfareItems } from "../admin/welfare";
import { supabaseAdmin } from "../supabase";
import type { WelfareItem } from "../../types";

export type HrBenefit = WelfareItem & { category: string | null };

/** สวัสดิการชุดเดียวกับ /admin/benefits พร้อมหมวด คืน null เมื่อโหลดไม่สำเร็จ */
export async function getHrBenefits(): Promise<HrBenefit[] | null> {
  const [items, categories] = await Promise.all([
    getWelfareItems(),
    supabaseAdmin.from("welfare_benefit").select("code, category").is("deleted_at", null).returns<{ code: string; category: string | null }[]>(),
  ]);
  if (!items) return null;
  if (categories.error) {
    console.error("[hr benefits] category load failed", categories.error);
    return null;
  }
  const categoryByCode = new Map((categories.data ?? []).map((row) => [row.code, row.category]));
  return items.map((item) => ({ ...item, category: categoryByCode.get(item.code) ?? null }));
}
