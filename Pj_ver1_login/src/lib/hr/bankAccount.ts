import { supabaseAdmin } from "@/lib/supabase";

// บัญชีหลักของพนักงาน (อ่านอย่างเดียว) ใช้แสดงว่าคำขอจะโอนเข้าบัญชีใคร
// ตรงกับบัญชีที่การเงินใช้ตอนบันทึกการโอน (applyClaimAction "pay")
export async function getPrimaryBankAccount(employeeCode: string): Promise<{ bankCode: string; accountMasked: string } | null> {
  const { data: employee } = await supabaseAdmin.from("employee").select("id").eq("employee_code", employeeCode).maybeSingle();
  if (!employee) return null;
  const { data, error } = await supabaseAdmin
    .from("employee_bank_account")
    .select("bank_code, account_no_masked")
    .eq("employee_id", employee.id)
    .eq("is_primary", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return { bankCode: data.bank_code, accountMasked: data.account_no_masked };
}
