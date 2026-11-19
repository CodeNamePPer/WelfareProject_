/**
 * ส่งอีเมลของระบบ (รหัสผ่านชั่วคราว อีเมลแจ้งเตือน) เลือกช่องทางจาก env:
 *   1. Gmail SMTP (lib/email/gmail.ts)  ตั้ง GMAIL_USER + GMAIL_APP_PASSWORD → ส่งถึงอีเมลจริงของแต่ละคน
 *   2. Resend REST API                   ตั้ง RESEND_API_KEY (https://resend.com/docs/api-reference/emails/send-email)
 *   ไม่ตั้งทั้งสองแบบ = ไม่ส่งอีเมล ระบบแสดงรหัสบนหน้าจอแทน
 *
 * env:
 *   EMAIL_FROM      ผู้ส่ง · Resend: ต้องเป็นโดเมนที่ verify แล้ว (onboarding@resend.dev ส่งถึงได้แค่อีเมลเจ้าของบัญชี Resend)
 *                   Gmail: ใช้แค่ชื่อที่แสดง ที่อยู่ผู้ส่งเป็น GMAIL_USER เสมอ
 *   EMAIL_TEST_TO   (ช่วงทดสอบ) ส่งทุกฉบับไปที่อีเมลนี้แทนผู้รับจริง · เว้นว่าง = ส่งถึงอีเมลของคนนั้นจริง
 */
import type { EmailDelivery } from "./address";
import { gmailCredentials, sendViaGmail } from "./gmail";

export type SendResult = { ok: true; id: string; deliveredTo: string } | { ok: false; error: string };

const DEFAULT_FROM_NAME = "ระบบพนักงานและสวัสดิการ";
const DEFAULT_FROM = `${DEFAULT_FROM_NAME} <onboarding@resend.dev>`;

export function isEmailConfigured(): boolean {
  return Boolean(gmailCredentials() || process.env.RESEND_API_KEY);
}

export function getEmailDelivery(): EmailDelivery {
  return { configured: isEmailConfigured(), testTo: process.env.EMAIL_TEST_TO?.trim() || null };
}

/** โดเมนสงวนสำหรับทดสอบ (RFC 2606 / 6761) เช่นบัญชีตัวอย่าง @welfare.test ส่งจริงไม่ถึงใคร */
const RESERVED_DOMAIN = /\.(test|example|invalid|localhost)$|(^|\.)example\.(com|net|org)$/i;

// ส่งทีละฉบับห่างกันอย่างน้อย SEND_GAP_MS · Resend แผนฟรีจำกัด 2 คำขอต่อวินาที และลองใหม่เมื่อโดน 429
const SEND_GAP_MS = 600;
/** เวลารอคำตอบจาก Resend ต่อครั้ง */
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_ATTEMPTS = 4;
let queue: Promise<unknown> = Promise.resolve();
let lastSentAt = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type OutgoingMessage = { to: string; subject: string; html: string; text: string };

export function sendEmail(message: OutgoingMessage): Promise<SendResult> {
  const job = queue.then(() => sendNow(message));
  queue = job.catch(() => undefined);
  return job;
}

async function sendNow(message: OutgoingMessage): Promise<SendResult> {
  const testTo = process.env.EMAIL_TEST_TO?.trim();
  const to = testTo || message.to;
  if (!testTo && RESERVED_DOMAIN.test(to.split("@")[1] ?? "")) return { ok: false, error: "อีเมลนี้เป็นโดเมนทดสอบ ส่งจริงไม่ได้" };
  const subject = testTo ? `[ทดสอบ → ${message.to}] ${message.subject}` : message.subject;

  const gmail = gmailCredentials();
  if (gmail) {
    await wait(Math.max(0, lastSentAt + SEND_GAP_MS - Date.now()));
    lastSentAt = Date.now();
    const result = await sendViaGmail(gmail, { fromName: fromName(), to, subject, text: message.text, html: message.html });
    return result.ok ? { ok: true, id: result.id, deliveredTo: to } : result;
  }
  return sendViaResend({ ...message, to, subject });
}

/** ชื่อผู้ส่งจาก EMAIL_FROM ("ชื่อ <ที่อยู่>" หรือชื่ออย่างเดียว) */
function fromName() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return DEFAULT_FROM_NAME;
  const name = from.includes("<") ? from.slice(0, from.indexOf("<")).trim().replace(/^"|"$/g, "") : from.includes("@") ? "" : from;
  return name || DEFAULT_FROM_NAME;
}

async function sendViaResend(message: OutgoingMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "ยังไม่ได้ตั้งค่าการส่งอีเมล" };
  const body = JSON.stringify({ from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM, to: [message.to], subject: message.subject, html: message.html, text: message.text });

  for (let attempt = 1; ; attempt += 1) {
    await wait(Math.max(0, lastSentAt + SEND_GAP_MS - Date.now()));
    lastSentAt = Date.now();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
        // คำขอค้างต้องไม่ทำให้คิวอีเมลรอไปตลอด
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (res.status === 429 && attempt < MAX_ATTEMPTS) {
        await wait(Number(res.headers.get("retry-after")) * 1000 || 1000 * attempt);
        continue;
      }
      if (!res.ok || !data.id) {
        console.error("[email] Resend error", res.status, data.message);
        return { ok: false, error: data.message ?? `Resend ตอบกลับ ${res.status}` };
      }
      return { ok: true, id: data.id, deliveredTo: message.to };
    } catch (err) {
      console.error("[email] Resend request failed", err);
      return { ok: false, error: "เชื่อมต่อ Resend ไม่ได้" };
    }
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
