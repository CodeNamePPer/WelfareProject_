"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { LoginForm } from "@/components/LoginForm";
import {
  avatarTone,
  forgetAccount,
  initialsOf,
  readKnownAccounts,
  type KnownAccount,
} from "@/lib/auth/knownAccounts";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { cn } from "@/utils/cn";

type Step = { kind: "choose" } | { kind: "password"; account: KnownAccount } | { kind: "other" };

const ROLE_PILL: Record<Role, string> = {
  EMPLOYEE: "bg-mist text-ink-soft",
  HR: "bg-[#e6f2ec] text-[#17603f]",
  FINANCE: "bg-primary-50 text-primary-700",
  SUPER_ADMIN: "bg-[#f8ecd2] text-[#7a5307]",
};

/** ป้ายบทบาทแบบสั้น (ROLE_LABELS มีวงเล็บภาษาอังกฤษยาวเกินไปสำหรับแถวบัญชี) */
const ROLE_SHORT: Record<Role, string> = {
  EMPLOYEE: ROLE_LABELS.EMPLOYEE,
  HR: "ฝ่ายบุคคล",
  FINANCE: "ฝ่ายการเงิน",
  SUPER_ADMIN: ROLE_LABELS.SUPER_ADMIN,
};

function Avatar({ account, size }: { account: KnownAccount; size: "md" | "lg" }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-semibold text-white",
        avatarTone(account.code),
        size === "md" ? "h-[calc(44rem/14)] w-[calc(44rem/14)] text-15" : "h-[calc(52rem/14)] w-[calc(52rem/14)] text-18",
      )}
    >
      {initialsOf(account.name)}
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  return <span className={cn("rounded-full px-2 py-px text-12 font-medium", ROLE_PILL[role])}>{ROLE_SHORT[role]}</span>;
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-ml-1.5 inline-flex items-center gap-1.5 rounded-lg py-1.5 pl-1.5 pr-2.5 text-14 text-ink-soft transition hover:bg-mist hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
    >
      <ChevronLeft className="h-[calc(18rem/14)] w-[calc(18rem/14)]" aria-hidden="true" />
      {children}
    </button>
  );
}

export function LoginExperience({ next, notice }: { next: string; notice?: React.ReactNode }) {
  // null = ยังไม่ได้อ่าน localStorage (อ่านได้เฉพาะฝั่งเบราว์เซอร์ หลัง hydrate)
  const [accounts, setAccounts] = useState<KnownAccount[] | null>(null);
  const [step, setStep] = useState<Step>({ kind: "choose" });
  const [managing, setManaging] = useState(false);

  useEffect(() => {
    const list = readKnownAccounts();
    setAccounts(list);
    if (list.length === 0) setStep({ kind: "other" });
  }, []);

  function remove(code: string) {
    const list = forgetAccount(code);
    setAccounts(list);
    if (list.length === 0) {
      setManaging(false);
      setStep({ kind: "other" });
    }
  }

  if (accounts === null) {
    // กันหน้ากระพริบจากฟอร์มปกติ → รายการบัญชี: เว้นที่ว่างไว้ครู่เดียว
    return <div className="min-h-[calc(420rem/14)]" aria-busy="true" />;
  }

  const hasAccounts = accounts.length > 0;

  return (
    <div key={step.kind === "password" ? step.account.code : step.kind} className="animate-step-in">
      {step.kind === "choose" && (
        <>
          <h1 className="text-[calc(28rem/14)] font-semibold tracking-[-0.01em]">เลือกบัญชี</h1>
          <p className="mt-1.5 text-15 text-ink-mute">บัญชีที่เคยเข้าสู่ระบบในเครื่องนี้</p>
          {notice}

          <ul className="mt-7 overflow-hidden rounded-[14px] bg-slip shadow-[0_1px_2px_rgba(15,23,42,.06),0_6px_20px_-10px_rgba(15,23,42,.12)]">
            {accounts.map((a) => (
              <li key={a.code} className="relative border-b border-mist">
                <button
                  type="button"
                  disabled={managing}
                  onClick={() => setStep({ kind: "password", account: a })}
                  className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[#f3f5f9] focus:outline-none focus-visible:bg-[#f3f5f9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40 disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <Avatar account={a} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-16 font-semibold">{a.name}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-13 text-ink-mute">
                      <span className="truncate">{a.code}</span>
                      <RolePill role={a.role} />
                    </span>
                  </span>
                  {!managing && (
                    <ChevronRight
                      aria-hidden="true"
                      className="h-5 w-5 text-[#9aa5b8] transition duration-300 ease-out group-hover:translate-x-[3px] group-hover:text-ink"
                    />
                  )}
                </button>
                {managing && (
                  <button
                    type="button"
                    onClick={() => remove(a.code)}
                    aria-label={`ลบบัญชี ${a.name} ออกจากเครื่องนี้`}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-danger transition hover:bg-danger/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
                  >
                    <X className="h-[calc(18rem/14)] w-[calc(18rem/14)]" aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
            <li>
              <button
                type="button"
                disabled={managing}
                onClick={() => setStep({ kind: "other" })}
                className="group flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[#f3f5f9] focus:outline-none focus-visible:bg-[#f3f5f9] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <span className="grid h-[calc(44rem/14)] w-[calc(44rem/14)] shrink-0 place-items-center rounded-full bg-mist text-ink-soft">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-16 font-semibold">ใช้บัญชีอื่น</span>
                  <span className="mt-0.5 block text-13 text-ink-mute">เข้าด้วยอีเมลหรือรหัสพนักงาน</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-5 w-5 text-[#9aa5b8] transition duration-300 ease-out group-hover:translate-x-[3px] group-hover:text-ink"
                />
              </button>
            </li>
          </ul>

          <div className="mt-4 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setManaging((v) => !v)}
              aria-pressed={managing}
              className="rounded text-14 text-ink-soft underline decoration-ink-soft/35 underline-offset-[3px] transition hover:text-ink hover:decoration-current focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {managing ? "เสร็จสิ้น" : "จัดการบัญชีในเครื่องนี้"}
            </button>
            <span className="text-13 text-ink-mute">ระบบไม่บันทึกรหัสผ่าน</span>
          </div>
        </>
      )}

      {step.kind === "password" && (
        <>
          <BackButton onClick={() => setStep({ kind: "choose" })}>เปลี่ยนบัญชี</BackButton>
          <div className="mb-7 mt-4 flex items-center gap-3.5 rounded-[14px] bg-slip px-4 py-3.5 shadow-card">
            <Avatar account={step.account} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-17 font-semibold">{step.account.name}</h1>
              <p className="truncate text-13 text-ink-mute">
                {step.account.code} · {step.account.login}
              </p>
            </div>
          </div>
          {notice}
          <LoginForm next={next} account={step.account} />
        </>
      )}

      {step.kind === "other" && (
        <>
          {hasAccounts && <BackButton onClick={() => setStep({ kind: "choose" })}>กลับไปเลือกบัญชี</BackButton>}
          <h1 className={cn("text-[calc(28rem/14)] font-semibold tracking-[-0.01em]", hasAccounts && "mt-3")}>
            เข้าสู่ระบบ
          </h1>
          <p className="mt-1.5 text-15 text-ink-mute">กรอกอีเมลหรือรหัสพนักงาน และรหัสผ่านของคุณ</p>
          {notice}
          <div className="mt-7">
            <LoginForm next={next} />
          </div>
        </>
      )}
    </div>
  );
}
