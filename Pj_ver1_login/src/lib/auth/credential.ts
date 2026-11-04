import { supabaseAdmin } from "../supabase";

/**
 * สถานะรหัสผ่านใน employee_credential (ไม่ import bcrypt เพื่อให้ middleware ใช้ได้)
 * ห้ามส่ง password_hash ออกจากไฟล์นี้ ยกเว้น getPasswordHash ที่ใช้ตรวจรหัสฝั่ง server
 */
export interface PasswordState {
  /** password_changed_at เป็น ms */
  changedAt: number;
  mustChange: boolean;
}

type CredentialRow = { password_changed_at: string; must_change_password: boolean; password_hash?: string };

async function loadCredential(employeeCode: string, withHash: boolean): Promise<CredentialRow | null> {
  const columns = `password_changed_at, must_change_password${withHash ? ", password_hash" : ""}, employee!inner(employee_code)`;
  const { data, error } = await supabaseAdmin
    .from("employee_credential")
    .select(columns)
    .eq("employee.employee_code", employeeCode)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CredentialRow | null) ?? null;
}

export function toPasswordState(row: { password_changed_at: string; must_change_password: boolean }): PasswordState {
  return { changedAt: Date.parse(row.password_changed_at), mustChange: row.must_change_password };
}

export async function getPasswordState(employeeCode: string): Promise<PasswordState | null> {
  const row = await loadCredential(employeeCode, false);
  return row ? toPasswordState(row) : null;
}

export async function getPasswordHash(employeeCode: string): Promise<string | null> {
  const row = await loadCredential(employeeCode, true);
  return row?.password_hash ?? null;
}

/**
 * บันทึกรหัสผ่านใหม่ (hash แล้ว) และเลื่อน password_changed_at ซึ่งทำให้ session เดิมทั้งหมดใช้ไม่ได้
 * คืนค่า PasswordState ใหม่ไว้ออก session ให้เครื่องที่เปลี่ยนเอง
 */
export async function savePassword(employeeCode: string, passwordHash: string, mustChange: boolean): Promise<PasswordState> {
  const { data: emp, error: empError } = await supabaseAdmin
    .from("employee")
    .select("id")
    .eq("employee_code", employeeCode)
    .is("deleted_at", null)
    .maybeSingle();
  if (empError) throw empError;
  if (!emp) throw new Error("ไม่พบผู้ใช้งาน");

  const changedAt = new Date();
  const { error } = await supabaseAdmin
    .from("employee_credential")
    .update({
      password_hash: passwordHash,
      must_change_password: mustChange,
      password_changed_at: changedAt.toISOString(),
    })
    .eq("employee_id", emp.id);
  if (error) throw error;

  return { changedAt: changedAt.getTime(), mustChange };
}
