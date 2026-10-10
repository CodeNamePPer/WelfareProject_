import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import LogoutButton from "@/components/LogoutButton";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // ผู้ดูแลระบบ ส่งต่อไปยังหน้าจัดการสมาชิก
  if (session.role === "SUPER_ADMIN") {
    redirect("/admin/users");
  }

  const roleLabel = ROLE_LABELS[session.role as Role] || session.role;

  // สำหรับ Role อื่นๆ ที่ยังไม่มีหน้าระบบ แสดงหน้าว่างชั่วคราว
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <header className="border-b border-mist bg-slip px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-ink">ระบบสวัสดิการพนักงาน</h1>
            <p className="text-xs text-ink-mute">Welfare & Employee Portal</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-ink">{session.name}</p>
              <span className="inline-block rounded bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-soft">
                {roleLabel}
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-mist bg-slip p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-mist/60 text-ink-soft">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.23c.55 0 1.07.214 1.46.595.78.76.78 2.01 0 2.77l-1.46-1.46m0-1.905l1.9-1.9a1.94 1.94 0 000-2.75l-.94-.94a1.94 1.94 0 00-2.75 0l-1.9 1.9"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-ink">ยินดีต้อนรับ, {session.name}</h2>
          <p className="mt-1 text-sm text-ink-mute">
            คุณเข้าสู่ระบบในฐานะ: <strong className="text-ink">{roleLabel}</strong>
          </p>

          <div className="mt-6 rounded-lg bg-paper p-4 text-left border border-mist text-sm">
            <p className="text-ink-soft font-medium">📌 สถานะระบบ:</p>
            <p className="mt-1 text-xs text-ink-mute">
              ส่วนของบทบาทนี้ยังอยู่ระหว่างการพัฒนา (ยังไม่ได้เปิดให้บริการ) หากมีข้อสงสัยสามารถติดต่อฝ่าย IT Support ได้ครับ
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
