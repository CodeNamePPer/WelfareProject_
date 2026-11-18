import "server-only";
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase";

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
