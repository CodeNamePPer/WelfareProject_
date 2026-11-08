// ที่เก็บข้อมูลกลางของเมนู Payroll (ชั่วคราว ก่อนมี backend)
//   settings  = การตั้งค่าวันจ่ายของรอบที่บันทึกแล้ว
//   overrides = วันจ่ายที่เลื่อนรายคำขอ { เลขที่คำขอ: วันที่ ISO }
// เก็บไว้ใน localStorage ของ browser: เปลี่ยนหน้าหรือรีเฟรชแล้วค่ายังอยู่ แต่เห็นแค่ใน browser เครื่องนั้น
//
// ตอนต่อ backend: แก้แค่ read() / write() ในไฟล์นี้ให้ดึง/บันทึกกับ server หน้าอื่นไม่ต้องแก้

import { useSyncExternalStore } from "react";
import { DEFAULT_PAY_SETTINGS, resolvePayDate, type PaySettings } from "./pay-settings";
import type { PaymentRequest } from "./types";

export interface PayrollState {
  settings: PaySettings;
  overrides: Record<string, string>;
}

const STORAGE_KEY = "payroll-demo-state-v1";
const DEFAULT_STATE: PayrollState = { settings: DEFAULT_PAY_SETTINGS, overrides: {} };

let cache: PayrollState | null = null; // ค่าล่าสุดที่อ่านแล้ว (ต้องคืน object เดิมถ้าไม่มีอะไรเปลี่ยน)
const listeners = new Set<() => void>();

/** ตรวจข้อมูลที่อ่านจาก localStorage: ช่องไหนผิดรูปแบบใช้ค่าเริ่มต้นแทน */
function sanitize(raw: unknown): PayrollState {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<PayrollState>;
  const s = (obj.settings ?? {}) as Partial<PaySettings>;
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
  const settings: PaySettings = {
    round1PayDay: num(s.round1PayDay, DEFAULT_PAY_SETTINGS.round1PayDay),
    round1MonthOffset: num(s.round1MonthOffset, DEFAULT_PAY_SETTINGS.round1MonthOffset),
    round2PayDay: num(s.round2PayDay, DEFAULT_PAY_SETTINGS.round2PayDay),
    round2MonthOffset: num(s.round2MonthOffset, DEFAULT_PAY_SETTINGS.round2MonthOffset),
  };
  const overrides: Record<string, string> = {};
  if (obj.overrides && typeof obj.overrides === "object") {
    for (const [id, date] of Object.entries(obj.overrides)) {
      if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) overrides[id] = date;
    }
  }
  return { settings, overrides };
}

function read(): PayrollState {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? sanitize(JSON.parse(raw)) : DEFAULT_STATE;
  } catch {
    cache = DEFAULT_STATE; // เปิดแบบไม่ระบุตัวตน / ปิด storage ก็ยังใช้งานได้ แค่ไม่จำค่า
  }
  return cache;
}

function write(next: PayrollState) {
  cache = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // บันทึกไม่ได้ก็ยังใช้ค่าในหน่วยความจำต่อได้
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // เปิดหลายแท็บ: แท็บอื่นแก้ค่า แท็บนี้อัปเดตตาม
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Hook อ่าน/แก้ข้อมูลกลาง ใช้ใน client component
 *   ตอน render บน server ได้ค่าเริ่มต้น แล้วใน browser จะอ่านค่าที่บันทึกไว้ (ไม่เกิด hydration error)
 */
export function usePayrollStore() {
  const state = useSyncExternalStore(subscribe, read, () => DEFAULT_STATE);
  return {
    ...state,
    /** บันทึกการตั้งค่าวันจ่ายของรอบ */
    saveSettings: (settings: PaySettings) => write({ ...read(), settings }),
    /** เลื่อนวันจ่ายของคำขอหลายรายการเป็นวันเดียวกัน */
    reschedule: (ids: Iterable<string>, date: string) => {
      const overrides = { ...read().overrides };
      for (const id of ids) overrides[id] = date;
      write({ ...read(), overrides });
    },
    /** ยกเลิกการเลื่อนของคำขอ 1 รายการ */
    undoReschedule: (id: string) => {
      const overrides = { ...read().overrides };
      delete overrides[id];
      write({ ...read(), overrides });
    },
  };
}

/** กำหนดจ่ายตามรอบ (ยังไม่รวมการเลื่อนรายคำขอ) */
export function roundPayDate(r: PaymentRequest, settings: PaySettings) {
  const year = Number(r.requestDate.slice(0, 4));
  const month = Number(r.requestDate.slice(5, 7));
  return resolvePayDate(year, month, r.round, settings);
}

/**
 * คืนรายการคำขอที่ใช้วันจ่ายจริง: รายการที่ยังไม่จ่าย -> วันที่เลื่อน (ถ้ามี) หรือวันตามการตั้งค่ารอบ
 * รายการที่จ่ายแล้วคงวันจ่ายเดิม
 */
export function applyPayroll(requests: PaymentRequest[], { settings, overrides }: PayrollState): PaymentRequest[] {
  return requests.map((r) => (r.status === "paid" ? r : { ...r, payDate: overrides[r.id] ?? roundPayDate(r, settings) }));
}

/** Hook: รายการคำขอที่ใช้วันจ่ายตามข้อมูลกลางแล้ว */
export function useEffectiveRequests(requests: PaymentRequest[]) {
  const state = usePayrollStore();
  return applyPayroll(requests, state);
}

const noopSubscribe = () => () => {};

/**
 * true เมื่อทำงานใน browser แล้ว (อ่านค่าที่บันทึกไว้ได้), false ตอน render บน server / ก่อน hydrate
 * ใช้แสดง skeleton แทนการโชว์ค่าเริ่มต้นแว้บหนึ่งแล้วเปลี่ยนเป็นค่าที่บันทึกไว้
 */
export function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
