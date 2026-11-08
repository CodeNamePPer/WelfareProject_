// การตัดสินคำขอตัวอย่าง (อนุมัติ/ปฏิเสธ/ส่งกลับ) ยังไม่มีตารางคำขอในฐานข้อมูล
// จึงจำไว้ใน sessionStorage เฉพาะแท็บนี้ ให้คิวกับหน้ารายละเอียดเห็นตรงกัน และเลิกทำได้

import type { RequestAction } from "./home/queueRules";

const KEY = "hr-sample-decisions";

export type SampleDecision = { action: RequestAction; reason: string; at: string };

export function readDecisions(): Record<string, SampleDecision> {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, SampleDecision>) : {};
  } catch {
    return {};
  }
}

function write(decisions: Record<string, SampleDecision>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(decisions));
  } catch {
    // sessionStorage ใช้ไม่ได้ (เช่นโหมดส่วนตัว) การตัดสินจะหายเมื่อเปลี่ยนหน้า ซึ่งยอมรับได้สำหรับข้อมูลตัวอย่าง
  }
}

export function saveDecisions(ids: string[], action: RequestAction, reason = "") {
  const decisions = readDecisions();
  const at = new Date().toISOString();
  for (const id of ids) decisions[id] = { action, reason, at };
  write(decisions);
}

export function removeDecisions(ids: string[]) {
  const decisions = readDecisions();
  for (const id of ids) delete decisions[id];
  write(decisions);
}
