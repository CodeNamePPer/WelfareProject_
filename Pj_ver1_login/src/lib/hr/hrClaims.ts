import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";
import { listClaims } from "@/lib/claims/service";
import type { ClaimRecord } from "@/lib/claims/types";
import { HR_PENDING } from "@/features/hr/queue";

// คำขอเบิกของ HR (ดีไซน์ HH4): คำขอที่เจ้าของสิทธิ์ถือบทบาท HR ต้องให้หัวหน้า HR เป็นผู้ตรวจ

/** รหัสพนักงานของทุกคนที่ถือบทบาท HR อยู่ (null = โหลดไม่สำเร็จ) */
export const getHrStaffCodes = cache(async (): Promise<Set<string> | null> => {
  const { data, error } = await supabaseAdmin
    .from("user_role")
    .select("employee:employee_id(employee_code, deleted_at), role:role_id!inner(code, is_active)")
    .eq("role.code", "HR")
    .eq("role.is_active", true)
    .is("revoked_at", null)
    .returns<{ employee: { employee_code: string; deleted_at: string | null } | null }[]>();
  if (error) {
    console.error("[hr claims] HR staff lookup failed", error);
    return null;
  }
  return new Set((data ?? []).flatMap((row) => (row.employee && !row.employee.deleted_at ? [row.employee.employee_code] : [])));
});

/** คำขอของ HR ที่รอหัวหน้า HR ตรวจ ไม่รวมคำขอของหัวหน้าเอง (null = โหลดไม่สำเร็จ) */
export async function listHrClaimsForHead(headCode: string): Promise<ClaimRecord[] | null> {
  const [staff, claims] = await Promise.all([getHrStaffCodes(), listClaims({ statuses: HR_PENDING })]);
  if (!staff || !claims) return null;
  return claims.filter((claim) => claim.employeeCode !== headCode && staff.has(claim.employeeCode));
}

/** ตัวเลขบนเมนู "คำขอเบิกของ HR" โหลดไม่ได้คืน 0 */
export async function countHrClaimsForHead(headCode: string): Promise<number> {
  const staff = await getHrStaffCodes();
  if (!staff) return 0;
  const others = [...staff].filter((code) => code !== headCode);
  if (others.length === 0) return 0;
  const { count, error } = await supabaseAdmin
    .from("welfare_claim")
    .select("id, owner:employee_id!inner(employee_code)", { count: "exact", head: true })
    .in("owner.employee_code", others)
    .in("status", HR_PENDING)
    .is("deleted_at", null);
  if (error) {
    console.error("[hr claims] count failed", error);
    return 0;
  }
  return count ?? 0;
}
