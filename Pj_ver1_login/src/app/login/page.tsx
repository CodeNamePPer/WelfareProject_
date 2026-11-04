import { LoginForm } from "@/components/LoginForm";

function safeNext(next: string | undefined): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slip px-6 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-2 text-sm font-semibold text-ink-mute">ระบบพนักงานเเละสวัสดิการ</p>
        <h1 className="text-2xl font-semibold">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-ink-mute">ใช้อีเมลในการเข้าสู่ระบบ</p>
        {reason === "password" ? (
          <p role="status" className="mt-4 rounded-md border border-mist bg-white px-3.5 py-2.5 text-sm text-ink">
            รหัสผ่านของบัญชีนี้เพิ่งถูกเปลี่ยนหรือรีเซ็ต กรุณาเข้าสู่ระบบใหม่
          </p>
        ) : null}
        <LoginForm next={safeNext(next)} />
      </div>
    </main>
  );
}
