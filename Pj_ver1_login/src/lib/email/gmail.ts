import "server-only";
import { randomUUID } from "node:crypto";
import tls from "node:tls";

/**
 * ส่งอีเมลผ่าน Gmail SMTP (smtp.gmail.com:465 TLS) ด้วยบัญชี Gmail ของระบบ
 * ส่งถึงอีเมลจริงของผู้รับได้ทุกโดเมน ไม่ต้อง verify โดเมนแบบ Resend · Gmail ทั่วไปส่งได้ราว 500 ฉบับต่อวัน
 *
 * env:
 *   GMAIL_USER          อีเมล Gmail ที่ใช้ส่ง เช่น welfare.system@gmail.com (ผู้รับเห็นเป็นผู้ส่ง)
 *   GMAIL_APP_PASSWORD  รหัสผ่านสำหรับแอป 16 ตัว จาก https://myaccount.google.com/apppasswords
 *                       (บัญชีต้องเปิดการยืนยันตัวตน 2 ขั้นตอนก่อน · ไม่ใช่รหัสผ่าน Gmail ปกติ)
 */

const HOST = "smtp.gmail.com";
const PORT = 465;
const TIMEOUT_MS = 20_000;

export type GmailCredentials = { user: string; pass: string };

export function gmailCredentials(): GmailCredentials | null {
  const user = process.env.GMAIL_USER?.trim();
  // Google แสดงรหัสแอปเป็น 4 กลุ่มคั่นด้วยช่องว่าง วางมาทั้งแบบนั้นก็ได้
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, "");
  return user && pass ? { user, pass } : null;
}

export type MailMessage = { fromName: string; to: string; subject: string; text: string; html: string };

export type GmailResult = { ok: true; id: string } | { ok: false; error: string };

const ADDRESS = /^[^\s<>@",;]+@[^\s<>@",;]+$/;

export async function sendViaGmail(credentials: GmailCredentials, message: MailMessage): Promise<GmailResult> {
  if (!ADDRESS.test(message.to)) return { ok: false, error: "อีเมลผู้รับไม่ถูกต้อง" };
  const domain = credentials.user.split("@")[1] ?? "gmail.com";
  const messageId = `<${randomUUID()}@${domain}>`;
  const raw = buildMime({ ...message, from: credentials.user, messageId });

  let smtp: SmtpConnection | null = null;
  try {
    smtp = await SmtpConnection.open();
    await smtp.expect(null, [220]);
    await smtp.expect(`EHLO ${domain}`, [250]);
    const auth = await smtp.command(`AUTH PLAIN ${Buffer.from(`\0${credentials.user}\0${credentials.pass}`).toString("base64")}`);
    if (auth.code !== 235) {
      return { ok: false, error: auth.code === 535 || auth.code === 534 ? "Gmail ไม่ยอมรับ GMAIL_USER / GMAIL_APP_PASSWORD (ต้องเป็นรหัสผ่านสำหรับแอป)" : `Gmail ตอบกลับ ${auth.code}` };
    }
    await smtp.expect(`MAIL FROM:<${credentials.user}>`, [250]);
    await smtp.expect(`RCPT TO:<${message.to}>`, [250, 251]);
    await smtp.expect("DATA", [354]);
    // จุดขึ้นต้นบรรทัดต้องเติมจุดอีกตัว (RFC 5321 4.5.2) · เนื้อหาเป็น base64 อยู่แล้วแต่กันไว้
    await smtp.expect(`${raw.replace(/^\./gm, "..")}\r\n.`, [250]);
    void smtp.command("QUIT").catch(() => undefined);
    return { ok: true, id: messageId };
  } catch (err) {
    if (err instanceof SmtpError) {
      console.error("[email] Gmail SMTP rejected", { code: err.code, reply: err.reply.slice(0, 200) });
      return { ok: false, error: `Gmail ตอบกลับ ${err.code}` };
    }
    console.error("[email] Gmail SMTP failed", (err as Error).message);
    return { ok: false, error: "เชื่อมต่อ Gmail ไม่ได้" };
  } finally {
    smtp?.close();
  }
}

// ---------- MIME ----------

function buildMime(message: MailMessage & { from: string; messageId: string }) {
  const boundary = `b_${randomUUID().replace(/-/g, "")}`;
  const headers = [
    `From: ${encodeWord(message.fromName)} <${message.from}>`,
    `To: <${message.to}>`,
    `Subject: ${encodeWord(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${message.messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative;\r\n boundary="${boundary}"`,
  ];
  const part = (type: string, body: string) => [`--${boundary}`, `Content-Type: ${type}; charset=UTF-8`, "Content-Transfer-Encoding: base64", "", wrap(Buffer.from(body, "utf8").toString("base64"))];
  return [...headers, "", ...part("text/plain", message.text), ...part("text/html", message.html), `--${boundary}--`].join("\r\n");
}

/** หัวอีเมลภาษาไทย: RFC 2047 encoded-word ทีละไม่เกิน 45 ไบต์ (ได้ไม่เกิน 75 ตัวต่อคำ) ไม่ตัดกลางตัวอักษร */
function encodeWord(value: string) {
  const clean = value.replace(/[\r\n]+/g, " ");
  if (/^[\x20-\x7E]*$/.test(clean) && !clean.includes("=?")) return clean;
  const words: string[] = [];
  let chunk = "";
  for (const char of clean) {
    if (Buffer.byteLength(chunk + char, "utf8") > 45) {
      words.push(chunk);
      chunk = "";
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words.map((word) => `=?UTF-8?B?${Buffer.from(word, "utf8").toString("base64")}?=`).join("\r\n ");
}

const wrap = (base64: string) => base64.match(/.{1,76}/g)?.join("\r\n") ?? "";

// ---------- SMTP ----------

class SmtpError extends Error {
  constructor(
    readonly code: number,
    readonly reply: string,
  ) {
    super(`SMTP ${code}`);
  }
}

type Reply = { code: number; text: string };

class SmtpConnection {
  private buffer = "";
  private lines: string[] = [];
  private replies: Reply[] = [];
  private waiting: { resolve: (reply: Reply) => void; reject: (err: Error) => void }[] = [];
  private failure: Error | null = null;

  private constructor(private readonly socket: tls.TLSSocket) {
    socket.setEncoding("utf8");
    socket.setTimeout(TIMEOUT_MS, () => this.fail(new Error("SMTP timeout")));
    socket.on("data", (data: string) => this.receive(data));
    socket.on("error", (err) => this.fail(err));
    socket.on("close", () => this.fail(new Error("SMTP connection closed")));
  }

  static open(): Promise<SmtpConnection> {
    return new Promise((resolve, reject) => {
      const socket = tls.connect({ host: HOST, port: PORT, servername: HOST }, () => resolve(new SmtpConnection(socket)));
      socket.once("error", reject);
    });
  }

  /** ส่งคำสั่ง (null = รอคำทักทายตอนเชื่อมต่อ) แล้วคืนคำตอบ */
  command(line: string | null): Promise<Reply> {
    if (line !== null) this.socket.write(`${line}\r\n`);
    const ready = this.replies.shift();
    if (ready) return Promise.resolve(ready);
    if (this.failure) return Promise.reject(this.failure);
    return new Promise((resolve, reject) => this.waiting.push({ resolve, reject }));
  }

  async expect(line: string | null, codes: number[]): Promise<Reply> {
    const reply = await this.command(line);
    if (!codes.includes(reply.code)) throw new SmtpError(reply.code, reply.text);
    return reply;
  }

  close() {
    this.socket.destroy();
  }

  private receive(data: string) {
    this.buffer += data;
    let end: number;
    while ((end = this.buffer.indexOf("\r\n")) >= 0) {
      const line = this.buffer.slice(0, end);
      this.buffer = this.buffer.slice(end + 2);
      this.lines.push(line);
      // คำตอบหลายบรรทัด "250-..." จบที่บรรทัด "250 ..."
      if (/^\d{3}(?: |$)/.test(line)) {
        const reply = { code: Number(line.slice(0, 3)), text: this.lines.join("\n") };
        this.lines = [];
        const waiter = this.waiting.shift();
        if (waiter) waiter.resolve(reply);
        else this.replies.push(reply);
      }
    }
  }

  private fail(err: Error) {
    if (this.failure) return;
    this.failure = err;
    for (const waiter of this.waiting.splice(0)) waiter.reject(err);
  }
}
