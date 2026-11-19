import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import LogoutButton from "@/components/LogoutButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "เปลี่ยนรหัสผ่าน" };

export const dynamic = "force-dynamic";

/**
 * เปลี่ยนรหัสผ่าน: ใช้ทั้งตอนถูกบังคับตั้งรหัสใหม่ (หลังรีเซ็ต/บัญชีใหม่) และตอนกดเปลี่ยนรหัสจากหน้าโปรไฟล์ Admin/HR
 */
export default async function ChangePasswordPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const forced = Boolean(session.mcp);
  const backHref =
    session.role === "SUPER_ADMIN" ? "/admin/profile" : session.role === "HR" ? "/hr/profile" : "/employee/profile";

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-12">
      <div className="w-full max-w-sm rounded-[10px] border border-line bg-white p-[24px]">
        <p className="mb-2 text-13 font-semibold text-muted">ระบบพนักงานและสวัสดิการ</p>
        <h1 className="text-22 font-semibold text-ink">{forced ? "ตั้งรหัสผ่านใหม่" : "เปลี่ยนรหัสผ่าน"}</h1>
        <p className="mt-2 text-13 text-muted">
          {forced
            ? `สวัสดี ${session.name} ก่อนเริ่มใช้งาน กรุณาตั้งรหัสผ่านใหม่แทนรหัสชั่วคราวที่ได้รับ`
            : "กรอกรหัสผ่านปัจจุบันและตั้งรหัสผ่านใหม่ เครื่องอื่นที่ล็อกอินค้างไว้จะถูกออกจากระบบอัตโนมัติ"}
        </p>
        <div className="mt-[20px]">
          <ChangePasswordForm
            employeeId={session.sub}
            loginName={session.email}
            redirectTo={forced ? "/" : undefined}
            submitLabel={forced ? "ตั้งรหัสผ่านและเข้าสู่ระบบ" : "เปลี่ยนรหัสผ่าน"}
          />
        </div>
        <div className="mt-[16px] flex justify-center gap-4">
          {forced ? (
            <LogoutButton />
          ) : (
            <Link href={backHref} className="text-13 font-medium text-primary-600 hover:underline">
              กลับไปหน้าโปรไฟล์
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
