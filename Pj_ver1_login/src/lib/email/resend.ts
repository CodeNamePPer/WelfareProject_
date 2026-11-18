/**
 * ส่งอีเมลผ่าน Resend REST API (https://resend.com/docs/api-reference/emails/send-email)
 * ใช้ fetch ตรง ๆ ไม่ต้องติดตั้ง SDK
 *
 * env:
 *   RESEND_API_KEY  คีย์จาก resend.com (ไม่ตั้ง = ไม่ส่งอีเมล ระบบแสดงรหัสบนหน้าจอแทน)
 *   EMAIL_FROM      ผู้ส่ง ต้องเป็นโดเมนที่ verify ใน Resend แล้ว
 *                   ยังไม่มีโดเมน: ใช้ onboarding@resend.dev ได้ แต่ส่งถึงได้แค่อีเมลเจ้าของบัญชี Resend
 *   EMAIL_TEST_TO   (ช่วงทดสอบ) ส่งทุกฉบับไปที่อีเมลนี้แทนผู้รับจริง
 */
import type { EmailDelivery } from "./address";

export type SendResult = { ok: true; id: string; deliveredTo: string } | { ok: false; error: string };

const DEFAULT_FROM = "ระบบพนักงานและสวัสดิการ <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getEmailDelivery(): EmailDelivery {
  return { configured: isEmailConfigured(), testTo: process.env.EMAIL_TEST_TO?.trim() || null };
}

// Resend จำกัด 2 คำขอต่อวินาที (แผนฟรี) ส่งทีละฉบับห่างกันอย่างน้อย SEND_GAP_MS และลองใหม่เมื่อโดน 429
const SEND_GAP_MS = 600;
const MAX_ATTEMPTS = 4;
let queue: Promise<unknown> = Promise.resolve();
let lastSentAt = 0;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function sendEmail(message: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const job = queue.then(() => sendNow(message));
  queue = job.catch(() => undefined);
  return job;
}

async function sendNow(message: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "ยังไม่ได้ตั้งค่า RESEND_API_KEY" };

  const testTo = process.env.EMAIL_TEST_TO?.trim();
  const to = testTo || message.to;
  const subject = testTo ? `[ทดสอบ → ${message.to}] ${message.subject}` : message.subject;
  const body = JSON.stringify({ from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM, to: [to], subject, html: message.html, text: message.text });

  for (let attempt = 1; ; attempt += 1) {
    await wait(Math.max(0, lastSentAt + SEND_GAP_MS - Date.now()));
    lastSentAt = Date.now();
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body,
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
      return { ok: true, id: data.id, deliveredTo: to };
    } catch (err) {
      console.error("[email] Resend request failed", err);
      return { ok: false, error: "เชื่อมต่อ Resend ไม่ได้" };
    }
  }
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
