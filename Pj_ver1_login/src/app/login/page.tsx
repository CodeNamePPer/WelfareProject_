import { LoginExperience } from "@/components/login/LoginExperience";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

/** ใบเบิก + ตราประทับอนุมัติ – โลโก้ระบบ */
function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="5" y="3" width="18" height="24" rx="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M9 10h10M9 14.5h10M9 19h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="23" r="6" fill="#D99A1E" />
      <path d="m20.5 23 1.8 1.8 3.4-3.6" fill="none" stroke="#18253F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 520 520" className={className} aria-hidden="true">
      <g fill="none" stroke="#D99A1E" strokeOpacity=".55">
        <circle cx="300" cy="230" r="150" strokeWidth="2" />
        <circle cx="300" cy="230" r="128" strokeDasharray="3 7" />
        <circle cx="300" cy="230" r="196" strokeOpacity=".18" />
        <circle cx="300" cy="230" r="250" strokeOpacity=".1" />
      </g>
      <g stroke="#fff" strokeOpacity=".14" strokeWidth="2" strokeLinecap="round">
        <rect x="190" y="120" width="170" height="220" rx="10" fill="#1f2f50" fillOpacity=".6" />
        <path d="M218 170h114M218 200h114M218 230h80M218 280h50" />
      </g>
      <path d="m258 236 30 30 60-64" fill="none" stroke="#D99A1E" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".85" />
    </svg>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  const notice =
    reason === "password" ? (
      <p role="status" className="mt-5 rounded-[10px] border border-mist bg-slip px-4 py-2.5 text-14 text-ink">
        รหัสผ่านของบัญชีนี้เพิ่งถูกเปลี่ยนหรือรีเซ็ต กรุณาเข้าสู่ระบบใหม่
      </p>
    ) : null;

  return (
    <main className="grid min-h-dvh grid-cols-1 grid-rows-[auto_1fr] bg-paper lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="relative flex flex-col overflow-hidden bg-ink px-7 pb-9 pt-8 text-white lg:px-16 lg:py-12">
        <BrandArt className="pointer-events-none absolute -right-20 -top-16 w-[calc(300rem/14)] lg:-right-24 lg:w-[calc(520rem/14)]" />
        <div className="relative flex items-center gap-3 text-15 font-semibold text-[#e8ecf4]">
          <LogoMark className="h-[calc(32rem/14)] w-[calc(32rem/14)] text-white" />
          ระบบพนักงานและสวัสดิการ
        </div>
        <p className="relative mt-8 max-w-[13ch] text-balance text-[calc(30rem/14)] font-semibold leading-[1.22] tracking-[-0.015em] lg:mt-auto lg:text-[clamp(calc(36rem/14),3.6vw,calc(56rem/14))]">
          เบิกและติดตาม<span className="text-stamp">สวัสดิการ</span>ของคุณในที่เดียว
        </p>
        <p className="relative mt-5 hidden max-w-[40ch] text-17 leading-[1.7] text-[#b9c3d6] lg:block">
          ยื่นคำขอเบิก แนบใบเสร็จ และดูสถานะการอนุมัติจากฝ่ายบุคคลได้ทันที
        </p>
        <div className="relative mt-14 hidden gap-7 text-13 text-[#a3aec2] lg:flex">
          <span>ระบบภายในบริษัท</span>
          <span>ลืมรหัสผ่าน? ติดต่อผู้ดูแลระบบ</span>
        </div>
      </aside>

      <div className="grid place-items-start justify-items-center px-5 py-9 lg:place-items-center lg:px-9 lg:py-12">
        <div className="w-full max-w-[calc(420rem/14)]">
          <LoginExperience next={safeNext(next)} notice={notice} />
        </div>
      </div>
    </main>
  );
}
