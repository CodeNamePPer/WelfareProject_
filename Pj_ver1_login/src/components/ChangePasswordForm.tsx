"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { checkNewPassword, PASSWORD_MAX, PASSWORD_RULES } from "@/lib/auth/password-policy";

type Props = {
  employeeId: string;
  loginName: string;
  /** สำเร็จแล้วไปหน้าไหน (ถ้าไม่ระบุจะแสดงข้อความสำเร็จในฟอร์ม) */
  redirectTo?: string;
  submitLabel?: string;
};

/** ฟอร์มเปลี่ยนรหัสผ่าน ใช้ทั้งหน้าบังคับตั้งรหัสใหม่ (/change-password) และหน้าโปรไฟล์ */
export function ChangePasswordForm({ employeeId, loginName, redirectTo, submitLabel = "เปลี่ยนรหัสผ่าน" }: Props) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setDone(false);
    if (!current || !next) return setError("กรุณากรอกรหัสผ่านปัจจุบันและรหัสผ่านใหม่");
    const policyError = checkNewPassword(next, { employeeId, loginName });
    if (policyError) return setError(policyError);
    if (next !== confirm) return setError("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "เปลี่ยนรหัสผ่านไม่สำเร็จ");
        setSaving(false);
        return;
      }
      if (redirectTo) {
        // โหลดใหม่ทั้งหน้าให้ middleware อ่าน session ใหม่
        window.location.href = redirectTo;
        return;
      }
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่");
    }
    setSaving(false);
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-line bg-white px-3 text-13 text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";
  const type = show ? "text" : "password";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-[14px]" noValidate>
      {/* ช่องชื่อผู้ใช้ซ่อนไว้ให้ password manager รู้ว่ารหัสนี้เป็นของบัญชีไหน */}
      <input type="text" name="username" autoComplete="username" value={loginName} readOnly hidden />
      <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
        รหัสผ่านปัจจุบัน
        <input
          type={type}
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          maxLength={PASSWORD_MAX}
          className={inputClass}
          required
        />
      </label>
      <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
        รหัสผ่านใหม่
        <input
          type={type}
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          maxLength={PASSWORD_MAX}
          aria-describedby="password-rules"
          className={inputClass}
          required
        />
      </label>
      <ul id="password-rules" className="-mt-[6px] list-disc space-y-[2px] pl-[18px] text-12 text-muted">
        {PASSWORD_RULES.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
        ยืนยันรหัสผ่านใหม่
        <input
          type={type}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          maxLength={PASSWORD_MAX}
          className={inputClass}
          required
        />
      </label>
      <label className="flex items-center gap-[8px] text-13 text-muted">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4" />
        แสดงรหัสผ่าน
      </label>

      {error ? (
        <p role="alert" className="text-12 text-danger">
          {error}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="text-12 text-ok">
          เปลี่ยนรหัสผ่านแล้ว เครื่องอื่นที่ล็อกอินค้างไว้จะถูกออกจากระบบ
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={saving}>
        {saving ? "กำลังบันทึก…" : submitLabel}
      </Button>
    </form>
  );
}
