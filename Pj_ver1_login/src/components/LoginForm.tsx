"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";

interface GRecaptcha {
  render: (
    el: HTMLElement,
    opts: { sitekey: string; callback: (t: string) => void; "expired-callback": () => void },
  ) => number;
  reset: (id?: number) => void;
}

declare global {
  interface Window {
    grecaptcha?: GRecaptcha;
    onRecaptchaLoad?: () => void;
  }
}

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);

  useEffect(() => {
    if (!SITE_KEY) return;

    const mount = () => {
      if (!window.grecaptcha || !boxRef.current || widgetId.current !== null) return;
      widgetId.current = window.grecaptcha.render(boxRef.current, {
        sitekey: SITE_KEY,
        callback: (t) => setToken(t),
        "expired-callback": () => setToken(null),
      });
    };

    if (window.grecaptcha?.render) {
      mount();
      return;
    }

    window.onRecaptchaLoad = mount;
    if (!document.getElementById("recaptcha-script")) {
      const s = document.createElement("script");
      s.id = "recaptcha-script";
      s.src = "https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, []);

  function resetCaptcha() {
    setToken(null);
    if (widgetId.current !== null) window.grecaptcha?.reset(widgetId.current);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (SITE_KEY && !token) {
      setError("กรุณายืนยันว่าคุณไม่ใช่โปรแกรมอัตโนมัติ");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, recaptchaToken: token }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
        setPassword("");
        resetCaptcha();
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่าคุณต่ออินเทอร์เน็ตของบริษัทอยู่");
      resetCaptcha();
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-md border border-mist bg-slip px-3.5 py-2.5 outline-none transition placeholder:text-ink-mute/70 focus:border-ink focus:ring-2 focus:ring-ink/20";

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
      <div>
        <label htmlFor="identifier" className="text-sm font-medium">
          อีเมลหรือรหัสพนักงาน
        </label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="name@company.co.th"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          รหัสผ่าน
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass + " pr-16"}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            className="absolute right-2 top-[calc(50%+3px)] -translate-y-1/2 rounded px-2 py-1 text-sm text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            {showPassword ? "ซ่อน" : "แสดง"}
          </button>
        </div>
      </div>

      {SITE_KEY ? (
        <div ref={boxRef} className="min-h-[78px]" />
      ) : (
        <p className="rounded-md bg-stamp/10 px-3 py-2 text-sm text-stamp-dark">
          ยังไม่ได้ตั้งค่า reCAPTCHA (โหมดพัฒนา) — ตั้งค่า NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน .env.local
        </p>
      )}

      <div role="alert" aria-live="polite">
        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-ink px-4 py-2.5 font-medium text-white transition hover:bg-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "กำลังเข้าสู่ระบบ" : "เข้าสู่ระบบ"}
      </button>

      <p className="text-sm text-ink-mute">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ</p>
    </form>
  );
}
