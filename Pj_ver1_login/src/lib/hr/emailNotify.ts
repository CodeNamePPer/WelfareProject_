import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { deliverableEmail } from "@/lib/email/address";
import { PREFERENCE_FOOTER, afterResponse, deliver, type NoticeMessage } from "@/lib/email/notify";
import { getHrHeadCode } from "./hrHead";

// อีเมลแจ้งเตือนฝั่ง HR ตามที่แต่ละคนเลือกไว้ในแท็บ "การแจ้งเตือน" ของโปรไฟล์ (hr_notification_preference.email)
// ส่งผ่าน lib/email/notify (หลังตอบ request) · อีเมลถึงผู้ขอและการเงินอยู่ใน lib/claims/notify

export type HrEmailTopic =
  | "claim_new"
  | "claim_resubmitted"
  | "advance_receipt"
  | "employee_edit_request"
  | "proposal_decided"
  | "proposal_pending"
  | "hr_claim_pending"
  | "my_claim_status";

const ADMIN_TOPICS: HrEmailTopic[] = ["proposal_decided", "my_claim_status"];

type Message = NoticeMessage;

type Recipient = { code: string; email: string };

/** HR ที่เปิดอีเมลของเรื่องนี้ไว้ ยังทำงานอยู่ และยังมีบทบาท HR */
async function recipientsFor(topic: HrEmailTopic): Promise<Recipient[]> {
  const { data, error } = await supabaseAdmin
    .from("hr_notification_preference")
    .select("employee:employee_id!inner(employee_code, email, employment_status, deleted_at, roles:user_role!employee_id(revoked_at, role:role_id(code, is_active)))")
    .eq("topic", topic)
    .eq("email", true)
    .returns<
      {
        employee: {
          employee_code: string;
          email: string | null;
          employment_status: string;
          deleted_at: string | null;
          roles: { revoked_at: string | null; role: { code: string; is_active: boolean } | null }[];
        };
      }[]
    >();
  if (error) throw error;
  return (data ?? []).flatMap(({ employee }) => {
    const email = deliverableEmail(employee.email);
    const isHr = employee.roles.some((row) => !row.revoked_at && row.role?.code === "HR" && row.role.is_active);
    // Admin เลือกรับได้เฉพาะเรื่องในโปรไฟล์ของ Admin (ผลข้อเสนอ สถานะคำขอของตัวเอง)
    const isAdmin = ADMIN_TOPICS.includes(topic) && employee.roles.some((row) => !row.revoked_at && row.role?.code === "SUPER_ADMIN" && row.role.is_active);
    return email && (isHr || isAdmin) && !employee.deleted_at && employee.employment_status === "active" ? [{ code: employee.employee_code, email }] : [];
  });
}

/**
 * ส่งอีเมลเรื่อง topic ถึง HR ที่เลือกรับไว้
 *   exclude   รหัสพนักงานที่ไม่ต้องได้ (ผู้ทำรายการเอง เจ้าของคำขอ)
 *   only      ส่งเฉพาะรหัสนี้ (เช่น หัวหน้า HR หรือเจ้าของคำขอ)
 */
export function emailHr(topic: HrEmailTopic, message: Message, options: { exclude?: string[]; only?: string[] | "hr_head" } = {}) {
  afterResponse(`hr:${topic}`, async () => {
    const only = options.only === "hr_head" ? [await getHrHeadCode()].filter((code): code is string => Boolean(code)) : options.only;
    if (only && only.length === 0) return;
    const recipients = (await recipientsFor(topic)).filter((r) => !options.exclude?.includes(r.code) && (!only || only.includes(r.code)));
    await deliver(`hr:${topic}`, recipients, message, PREFERENCE_FOOTER);
  });
}

/** เจ้าของคำขอมีบทบาท HR หรือไม่ (คำขอของ HR ไปที่หัวหน้า HR) */
export async function isHrEmployee(code: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("employee")
    .select("roles:user_role!employee_id(revoked_at, role:role_id(code))")
    .eq("employee_code", code)
    .maybeSingle<{ roles: { revoked_at: string | null; role: { code: string } | null }[] }>();
  return Boolean(data?.roles.some((row) => !row.revoked_at && row.role?.code === "HR"));
}
