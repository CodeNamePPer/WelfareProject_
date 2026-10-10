/**
 * จำกัดการล็อกอินผิดซ้ำ (in-memory)
 * ใช้ได้กับ server เครื่องเดียว หากรันหลาย instance ให้ย้ายไปเก็บใน Redis / DB
 */
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

interface Entry {
  count: number;
  lockedUntil: number;
}

const store = new Map<string, Entry>();

export function checkLock(key: string): { locked: boolean; retryAfterSec: number } {
  const e = store.get(key);
  if (!e || e.lockedUntil <= Date.now()) return { locked: false, retryAfterSec: 0 };
  return { locked: true, retryAfterSec: Math.ceil((e.lockedUntil - Date.now()) / 1000) };
}

export function registerFailure(key: string): void {
  const now = Date.now();
  const e = store.get(key);
  const count = e && e.lockedUntil > now - LOCK_MS ? e.count + 1 : 1;
  store.set(key, {
    count,
    lockedUntil: count >= MAX_ATTEMPTS ? now + LOCK_MS : 0,
  });
}

export function clearFailures(key: string): void {
  store.delete(key);
}
