// ที่เก็บข้อมูลกลางของเมนู Payroll: อ่าน/บันทึกกับฐานข้อมูลผ่าน /api/payroll/state
//   settings  = การตั้งค่าวันจ่ายของรอบ (system_setting.pay_schedule)
//   overrides = วันจ่ายที่เลื่อนรายคำขอ { เลขที่คำขอ: วันที่ ISO } (welfare_claim.pay_date_override)

import { useSyncExternalStore } from "react";
import { DEFAULT_PAY_SETTINGS, resolvePayDate, type PaySettings } from "./pay-settings";
import type { PaymentRequest } from "./types";

export interface PayrollState {
  settings: PaySettings;
  overrides: Record<string, string>;
}

const API = "/api/payroll/state";
const DEFAULT_STATE: PayrollState = { settings: DEFAULT_PAY_SETTINGS, overrides: {} };

let cache: PayrollState = DEFAULT_STATE;
let loaded = false;
let loading = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

async function load() {
  if (loading) return;
  loading = true;
  try {
    const response = await fetch(API, { cache: "no-store" });
    if (!response.ok) throw new Error(`load failed ${response.status}`);
    cache = (await response.json()) as PayrollState;
  } catch (err) {
    console.error("[payroll] load state failed", err);
  } finally {
    loaded = true;
    loading = false;
    emit();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) void load();
  return () => {
    listeners.delete(listener);
  };
}

const read = () => cache;

/** ส่งค่าไป server แล้วโหลดค่าจริงกลับมา คืนข้อความเมื่อไม่สำเร็จ */
async function send(method: "PUT" | "POST", body: unknown): Promise<string | null> {
  try {
    const response = await fetch(API, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) {
      const data = await response.json();
      return data.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    }
    await load();
    return null;
  } catch {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
}

/**
 * Hook อ่าน/แก้ข้อมูลกลาง ใช้ใน client component
 *   ตอน render บน server ได้ค่าเริ่มต้น แล้วใน browser จะโหลดค่าจริงจากฐานข้อมูล
 */
export function usePayrollStore() {
  const state = useSyncExternalStore(subscribe, read, () => DEFAULT_STATE);
  return {
    ...state,
    /** บันทึกการตั้งค่าวันจ่ายของรอบ */
    saveSettings: (settings: PaySettings) => send("PUT", settings),
    /** เลื่อนวันจ่ายของคำขอหลายรายการเป็นวันเดียวกัน */
    reschedule: (ids: Iterable<string>, date: string, reason: string) => send("POST", { ids: [...ids], date, reason }),
    /** ยกเลิกการเลื่อนของคำขอ 1 รายการ */
    undoReschedule: (id: string) => send("POST", { ids: [id], date: null, reason: "ยกเลิกการเลื่อนวันจ่าย" }),
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

/** true เมื่อโหลดค่าจากฐานข้อมูลแล้ว ใช้แสดง skeleton แทนการโชว์ค่าเริ่มต้นแว้บหนึ่ง */
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => loaded, () => false);
}
