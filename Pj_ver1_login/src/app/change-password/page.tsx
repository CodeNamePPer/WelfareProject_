import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import LogoutButton from "@/components/LogoutButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ตั้งรหัสผ่านใหม่" };

export const dynamic = "force-dynamic";

/**
 * บังคับตั้งรหัสผ่านใหม่ (บัญชีใหม่ / หลัง admin รีเซ็ตให้) — middleware ส่งมาที่นี่และไม่ให้ไปหน้าอื่นจนกว่าจะเปลี่ยนเสร็จ
 * อยู่นอก /admin เพราะพนักงานทุกบทบาทที่ถูกรีเซ็ตต้องผ่านหน้านี้
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-[24px]">
        <p className="mb-2 text-13 font-semibold text-muted">ระบบพนักงานและสวัสดิการ</p>
        <h1 className="text-22 font-semibold text-ink">ตั้งรหัสผ่านใหม่</h1>
        <p className="mt-2 text-13 text-muted">
          สวัสดี {session.name} ก่อนเริ่มใช้งาน กรุณาตั้งรหัสผ่านใหม่แทนรหัสชั่วคราวที่ได้รับ
        </p>
        <div className="mt-[20px]">
          <ChangePasswordForm
            employeeId={session.sub}
            loginName={session.email}
            redirectTo="/"
            submitLabel="ตั้งรหัสผ่านและเข้าสู่ระบบ"
          />
        </div>
        <div className="mt-[16px] flex justify-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}
