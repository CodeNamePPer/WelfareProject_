import "server-only";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { Role } from "@/lib/auth/roles";
import { getHrHeadCode } from "@/lib/hr/hrHead";
import { deliverableEmail } from "./address";
import { escapeHtml, isEmailConfigured, sendEmail } from "./resend";

// อีเมลแจ้งเตือนเรื่องคำขอ ใช้ร่วมกันทุกบทบาท (ผู้ขอ HR การเงิน Admin)
// ส่งหลังตอบ request แล้ว (after) อีเมลส่งไม่ได้ไม่กระทบงานหลัก · ไม่ตั้ง Gmail / Resend = ไม่ส่ง

export type NoticeMessage = { subject: string; lines: string[]; path: string };

export type Recipient = { code: string; email: string };

/** ท้ายอีเมลของคนที่ปิดอีเมลเองได้ในโปรไฟล์ (HR / Admin) */
export const PREFERENCE_FOOTER = "ปิดอีเมลเรื่องนี้ได้ที่ โปรไฟล์ → การแจ้งเตือน";
const DEFAULT_FOOTER = "อีเมลนี้ส่งอัตโนมัติจากระบบพนักงานและสวัสดิการ กรุณาอย่าตอบกลับ";

export function renderNotice(message: NoticeMessage, footer = DEFAULT_FOOTER) {
  const base = process.env.APP_URL?.trim().replace(/\/$/, "");
  const link = base ? `${base}${message.path}` : null;
  const text = [...message.lines, ...(link ? ["", `เปิดดู: ${link}`] : []), "", footer].join("\n");
  const html = [
    `<div style="font-family:Sarabun,Tahoma,sans-serif;font-size:14px;line-height:1.6;color:#0F172A">`,
    ...message.lines.map((line) => `<p style="margin:0 0 8px">${escapeHtml(line)}</p>`),
    link ? `<p style="margin:16px 0 0"><a href="${escapeHtml(link)}" style="color:#1D4ED8">เปิดดูในระบบ</a></p>` : "",
    `<p style="margin:16px 0 0;color:#64748B;font-size:12px">${escapeHtml(footer)}</p>`,
    `</div>`,
  ].join("");
  return { text, html };
}

/**
 * ช่วงทดสอบ: EMAIL_ONLY_TO จำกัดว่าอีเมลแจ้งเตือนของใครถูกส่งจริง (ฉบับที่ส่งยังเข้ากล่อง EMAIL_TEST_TO ถ้าตั้งไว้)
 *   hr_head            เฉพาะอีเมลถึงหัวหน้า HR คนปัจจุบัน
 *   E00010,E00002      เฉพาะรหัสพนักงานเหล่านี้ (ใส่ hr_head ปนได้)
 *   เว้นว่าง            ส่งทุกคนตามปกติ
 */
async function allowedRecipients(label: string, recipients: Recipient[]) {
  const only = (process.env.EMAIL_ONLY_TO ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (only.length === 0) return recipients;
  const codes = new Set(only.filter((value) => value !== "hr_head"));
  if (only.includes("hr_head")) {
    const head = await getHrHeadCode();
    if (head) codes.add(head);
  }
  const allowed = recipients.filter((recipient) => codes.has(recipient.code));
  if (allowed.length < recipients.length) console.info("[email] skipped (EMAIL_ONLY_TO)", { label, skipped: recipients.filter((r) => !codes.has(r.code)).map((r) => r.code) });
  return allowed;
}

/** ส่งทีละคน บันทึกผลลง log (ส่งพลาดไม่ throw) */
export async function deliver(label: string, recipients: Recipient[], message: NoticeMessage, footer?: string) {
  const { text, html } = renderNotice(message, footer);
  const seen = new Set<string>();
  for (const recipient of await allowedRecipients(label, recipients)) {
    if (seen.has(recipient.code)) continue;
    seen.add(recipient.code);
    const result = await sendEmail({ to: recipient.email, subject: message.subject, text, html });
    if (result.ok) console.info("[email] sent", { label, to: recipient.code, id: result.id });
    else console.error("[email] send failed", { label, to: recipient.code, error: result.error });
  }
}

/** ทำงานหลังส่งคำตอบให้ผู้ใช้แล้ว เรียกนอก request (เช่น สคริปต์) ทำทันทีแบบไม่รอ */
export function afterResponse(label: string, task: () => Promise<void>) {
  if (!isEmailConfigured()) return;
  const run = async () => {
    try {
      await task();
    } catch (err) {
      console.error("[email] notify failed", { label }, err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}

type EmployeeRow = {
  id: string;
  employee_code: string;
  email: string | null;
  employment_status: string;
  deleted_at: string | null;
  roles: { revoked_at: string | null; role: { code: string; is_active: boolean } | null }[];
};

const EMPLOYEE_SELECT = "id, employee_code, email, employment_status, deleted_at, roles:user_role!employee_id(revoked_at, role:role_id(code, is_active))";

const activeRoles = (row: EmployeeRow) => row.roles.filter((r) => !r.revoked_at && r.role?.is_active).map((r) => r.role!.code);

/** ยังทำงานอยู่และมีอีเมลที่ส่งได้ */
function usable(row: EmployeeRow): (Recipient & { id: string; roles: string[] }) | null {
  const email = deliverableEmail(row.email);
  if (!email || row.deleted_at || row.employment_status !== "active") return null;
  return { id: row.id, code: row.employee_code, email, roles: activeRoles(row) };
}

/**
 * ส่งถึงพนักงานตามรหัส (ผู้ขอ เจ้าของคำขอ)
 * คนที่มีบทบาท HR / Admin เลือกรับอีเมลเองในโปรไฟล์ จึงส่งเฉพาะเมื่อเปิด topic นี้ไว้ คนอื่นได้ทุกฉบับ
 */
export function emailEmployees(label: string, codes: string[], message: NoticeMessage, options: { exclude?: string[]; topic?: string } = {}) {
  const wanted = [...new Set(codes.filter((code) => code && !options.exclude?.includes(code)))];
  if (wanted.length === 0) return;
  afterResponse(label, async () => {
    const { data, error } = await supabaseAdmin.from("employee").select(EMPLOYEE_SELECT).in("employee_code", wanted).returns<EmployeeRow[]>();
    if (error) throw error;
    const people = (data ?? []).map(usable).filter((p): p is NonNullable<typeof p> => Boolean(p));
    const managed = people.filter((p) => p.roles.includes("HR") || p.roles.includes("SUPER_ADMIN"));
    let optedIn = new Set<string>();
    if (options.topic && managed.length > 0) {
      const { data: prefs, error: prefError } = await supabaseAdmin
        .from("hr_notification_preference")
        .select("employee_id")
        .eq("topic", options.topic)
        .eq("email", true)
        .in("employee_id", managed.map((p) => p.id));
      if (prefError) throw prefError;
      optedIn = new Set((prefs ?? []).map((row) => row.employee_id as string));
    }
    const recipients = people.filter((p) => !managed.includes(p) || !options.topic || optedIn.has(p.id));
    const managedOnly = recipients.length > 0 && recipients.every((p) => managed.includes(p));
    await deliver(label, recipients, message, managedOnly && options.topic ? PREFERENCE_FOOTER : undefined);
  });
}

/** ส่งถึงทุกคนที่มีบทบาทนี้ (เช่น การเงิน) ยกเว้นผู้ทำรายการ */
export function emailRole(label: string, role: Role, message: NoticeMessage, options: { exclude?: string[] } = {}) {
  afterResponse(label, async () => {
    const { data, error } = await supabaseAdmin
      .from("user_role")
      .select(`employee:employee_id(${EMPLOYEE_SELECT}), role:role_id!inner(code, is_active)`)
      .eq("role.code", role)
      .eq("role.is_active", true)
      .is("revoked_at", null)
      .returns<{ employee: EmployeeRow | null }[]>();
    if (error) throw error;
    const recipients = (data ?? [])
      .map((row) => (row.employee ? usable(row.employee) : null))
      .filter((p): p is NonNullable<typeof p> => Boolean(p) && !options.exclude?.includes(p!.code));
    await deliver(label, recipients, message);
  });
}
