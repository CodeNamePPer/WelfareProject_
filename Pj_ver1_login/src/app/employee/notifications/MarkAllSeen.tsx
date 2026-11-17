'use client';

import { useNavTransition } from "@/lib/useNavTransition";
import { useState } from "react";
import { pill } from "@/features/requester/ui";

/** ปุ่ม "อ่านทั้งหมดแล้ว" */
export function MarkAllSeen({ unread }: { unread: number }) {
  const nav = useNavTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/employee/notifications/read", { method: "POST" });
      if (!response.ok) return setError("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      nav.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error ? (
        <span role="alert" className="text-13 text-status-rejected">
          {error}
        </span>
      ) : null}
      <button type="button" onClick={() => void markAll()} disabled={busy || nav.isPending || unread === 0} className={pill.quiet}>
        {busy || nav.isPending ? "กำลังบันทึก..." : "อ่านทั้งหมดแล้ว"}
      </button>
    </div>
  );
}
