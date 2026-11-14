"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { rememberAccount, type KnownAccount } from "@/lib/auth/knownAccounts";
import type { Role } from "@/lib/auth/roles";

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

interface LoginResponse {
  error?: string;
  home?: string;
  mustChangePassword?: boolean;
  account?: { code: string; login: string; name: string; role: Role };
}

export function LoginForm({
  next,
  account = null,
}: {
  next: string;
  /** บัญชีที่เลือกจากตัวเลือกบัญชี – ซ่อนช่องอีเมลและใช้ชื่อล็อกอินของบัญชีนี้ */
  account?: KnownAccount | null;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(account?.login ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  // router.replace ไม่รอให้หน้าใหม่โหลดเสร็จ จึงต้องนับช่วงเปลี่ยนหน้าเป็นช่วงโหลดด้วย
  const busy = loading || isNavigating;

  const boxRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const identifierRef = useRef<HTMLInputElement>(null);

  // เลือกบัญชีมาแล้ว → โฟกัสช่องรหัสผ่านทันที / ใช้บัญชีอื่น → โฟกัสช่องอีเมล
  useEffect(() => {
    (account ? passwordRef : identifierRef).current?.focus();
  }, [account]);

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
    // แยกสาเหตุ: fetch ล้ม = ติดต่อเซิร์ฟเวอร์ไม่ได้เลย / อ่าน JSON ไม่ได้ = เซิร์ฟเวอร์ตอบมาแต่ผิดพลาด (เน็ตปกติ)
    let reachedServer = false;
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password, recaptchaToken: token }),
      });
      reachedServer = true;
      const data = (await res.json()) as LoginResponse;

      if (!res.ok) {
        setError(data.error ?? "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่");
        setPassword("");
        resetCaptcha();
        setLoading(false);
        passwordRef.current?.focus();
        return;
      }

      // จำบัญชีไว้ในเครื่อง: เลือกจากรายการ = อัปเดตลำดับล่าสุดเสมอ / บัญชีใหม่ = เฉพาะเมื่อติ๊กไว้
      if (data.account && (account || remember)) rememberAccount(data.account);

      // ไม่ได้ระบุหน้าที่จะกลับไป (next = "/") หรือต้องตั้งรหัสผ่านใหม่ก่อน → ไปหน้าแรกของ role นั้นตรงๆ
      const target = data.home && (next === "/" || data.mustChangePassword) ? data.home : next;
      startTransition(() => {
        router.replace(target);
        router.refresh();
      });
    } catch {
      setError(
        reachedServer
          ? "ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง หากยังไม่ได้ให้ติดต่อผู้ดูแลระบบ"
          : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ตรวจสอบว่าคุณต่ออินเทอร์เน็ตของบริษัทอยู่",
      );
      resetCaptcha();
      setLoading(false);
    }
  }

  const inputClass =
    "mt-2 h-[calc(48rem/14)] w-full rounded-[10px] border border-[#cfd7e4] bg-slip px-4 text-15 outline-none transition placeholder:text-[#6f7b8e] focus:border-ink focus:ring-[3px] focus:ring-ink/15";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        {account ? (
          // ให้ password manager ของเบราว์เซอร์รู้ว่ารหัสนี้เป็นของบัญชีไหน
          <input type="hidden" name="identifier" autoComplete="username" value={identifier} readOnly />
        ) : (
          <div>
            <label htmlFor="identifier" className="text-14 font-medium">
              อีเมลหรือรหัสพนักงาน
            </label>
            <input
              ref={identifierRef}
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
        )}

        <div>
          <label htmlFor="password" className="text-14 font-medium">
            รหัสผ่าน
          </label>
          <div className="relative">
            <input
              ref={passwordRef}
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
              className="absolute right-1.5 top-[calc(50%+4px)] -translate-y-1/2 rounded-md px-2.5 py-1.5 text-13 text-ink-soft hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {showPassword ? "ซ่อน" : "แสดง"}
            </button>
          </div>
        </div>

        {!account && (
          <label className="flex items-start gap-2.5 text-14 text-ink-soft">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 h-[calc(18rem/14)] w-[calc(18rem/14)] shrink-0 accent-ink"
            />
            <span>
              จำบัญชีนี้ไว้ในเครื่องนี้
              <span className="block text-13 text-ink-mute">ไม่แนะนำบนเครื่องที่ใช้ร่วมกับผู้อื่น</span>
            </span>
          </label>
        )}
      </fieldset>

      {SITE_KEY ? (
        <div ref={boxRef} className="min-h-[78px]" />
      ) : (
        <p className="rounded-md bg-stamp/10 px-3 py-2 text-13 text-stamp-dark">
          ยังไม่ได้ตั้งค่า reCAPTCHA (โหมดพัฒนา) — ตั้งค่า NEXT_PUBLIC_RECAPTCHA_SITE_KEY ใน
          .env.local
        </p>
      )}

      <div role="alert" aria-live="polite">
        {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-14 text-danger">{error}</p>}
      </div>

      <button
        type="submit"
        disabled={busy}
        aria-busy={busy}
        className="flex h-[calc(48rem/14)] w-full items-center justify-center gap-2 rounded-[10px] bg-ink px-4 text-15 font-semibold text-white transition hover:bg-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 active:scale-[.985] disabled:cursor-wait disabled:opacity-80"
      >
        {busy && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
        {busy ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
      </button>

      <p className="text-13 text-ink-mute">ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ</p>
    </form>
  );
}
