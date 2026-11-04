import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Tag } from "@/components/ui/Tag";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import type { EmployeeProfile, UserWithProfile } from "@/lib/auth/users";
import { formatThaiDate } from "@/lib/format";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "ทำงานอยู่", RESIGNED: "ลาออก", DECEASED: "เสียชีวิต" };

type InfoRow = [label: string, value: ReactNode];

const joinParts = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" ") || null;
const addressLabel = (p: EmployeeProfile) =>
  [p.addressLine, p.subdistrict, p.district, p.province, p.postalCode].filter(Boolean).join(" ") || null;

/** 2023-08-01 -> "3 ปี 2 เดือน" (นับถึงวันนี้) */
function tenureLabel(hireDate: string): string | null {
  const start = new Date(`${hireDate}T00:00:00`);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0 && rest === 0) return "ไม่ถึง 1 เดือน";
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : ""].filter(Boolean).join(" ");
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// โปรไฟล์อ่านอย่างเดียว: หัวโปรไฟล์ + 4 หมวด (ส่วนตัว / ติดต่อ / การทำงาน / บัญชี) เรียง 2 คอลัมน์บนจอกว้าง
// ชิดซ้ายเหมือนหน้า Admin อื่น หัวข้อหน้าจะได้อยู่ตำแหน่งเดิมเมื่อสลับเมนู
export function ProfilePage({ user, fallbackName }: { user: UserWithProfile | null; fallbackName: string }) {
  if (!user) {
    return (
      <div className="flex w-full max-w-[960px] flex-col gap-[20px]">
        <PageHeader title="โปรไฟล์ของฉัน" />
        <p className="rounded-[10px] border border-line bg-white p-[20px] text-13 text-muted">
          ไม่พบข้อมูลพนักงานของบัญชี {fallbackName} ในระบบ ลองออกจากระบบแล้วเข้าใหม่ หรือติดต่อผู้ดูแลฐานข้อมูล
        </p>
      </div>
    );
  }

  const p = user.profile;
  const initial = Array.from((p.firstNameTh ?? user.name).trim())[0] ?? "?";
  const workLine = [p.positionName, p.departmentName].filter(Boolean).join(" · ");
  const tenure = p.hireDate && user.status === "ACTIVE" ? tenureLabel(p.hireDate) : null;
  const endDate = user.status === "DECEASED" ? p.deceasedDate : p.resignedDate;

  const sections: { id: string; title: string; rows: InfoRow[] }[] = [
    {
      id: "personal",
      title: "ข้อมูลส่วนตัว",
      rows: [
        ["ชื่อ (ไทย)", joinParts(p.titleTh, p.firstNameTh, p.lastNameTh)],
        ["ชื่อ (อังกฤษ)", joinParts(p.firstNameEn, p.lastNameEn)],
        ["ชื่อเล่น", p.nickname],
      ],
    },
    {
      id: "contact",
      title: "ติดต่อ",
      rows: [
        ["อีเมลติดต่อ", p.contactEmail],
        ["เบอร์โทร", p.phone],
        ["ผู้ติดต่อฉุกเฉิน", joinParts(p.emergencyContactName, p.emergencyContactPhone && `· ${p.emergencyContactPhone}`)],
        ["ที่อยู่", addressLabel(p)],
      ],
    },
    {
      id: "work",
      title: "การทำงาน",
      rows: [
        ["รหัสพนักงาน", <span className="tabular-nums">{user.employeeId}</span>],
        ["แผนก", p.departmentName],
        ["ตำแหน่ง", p.positionName],
        ["ระดับ", p.jobLevelName],
        ["หัวหน้า", p.managerName ? `${p.managerName}${p.managerCode ? ` (${p.managerCode})` : ""}` : null],
        [
          "วันเริ่มงาน",
          p.hireDate ? (
            <>
              {formatThaiDate(p.hireDate)}
              {tenure ? <span className="font-normal text-muted"> · อายุงาน {tenure}</span> : null}
            </>
          ) : null,
        ],
        ...(endDate
          ? ([[user.status === "DECEASED" ? "วันที่เสียชีวิต" : "วันที่ลาออก", formatThaiDate(endDate)]] as InfoRow[])
          : []),
      ],
    },
    {
      id: "account",
      title: "บัญชีผู้ใช้งาน",
      rows: [
        ["ชื่อล็อกอิน", user.email],
        ["บทบาท", ROLE_LABELS[user.role as Role] ?? user.role],
        ["เข้าสู่ระบบล่าสุด", user.lastLoginAt ? <span className="tabular-nums">{formatDateTime(user.lastLoginAt)}</span> : null],
        ["แก้ไขข้อมูลล่าสุด", user.updatedAt ? <span className="tabular-nums">{formatDateTime(user.updatedAt)}</span> : null],
      ],
    },
  ];

  return (
    <div className="flex w-full max-w-[960px] flex-col gap-[20px]">
      <PageHeader
        title="โปรไฟล์ของฉัน"
        description="ข้อมูลของบัญชีที่เข้าระบบอยู่"
        action={
          <Link
            href={`/admin/users?user=${encodeURIComponent(user.employeeId)}`}
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink transition-colors hover:bg-surface motion-reduce:transition-none"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            แก้ไขข้อมูล
          </Link>
        }
      />

      <article aria-labelledby="profile-name" className="overflow-hidden rounded-[10px] border border-line bg-white">
        <header className="flex items-center gap-[16px] p-[20px]">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-50 text-22 font-semibold text-primary-700"
          >
            {initial}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
            <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[6px]">
              <h2 id="profile-name" className="min-w-0 break-words text-18 font-semibold text-ink">
                {user.name}
              </h2>
              <Tag tone="info">{ROLE_LABELS[user.role as Role] ?? user.role}</Tag>
              <Tag tone={user.status === "ACTIVE" ? "success" : "neutral"}>{STATUS_LABELS[user.status] ?? user.status}</Tag>
            </div>
            <p className="text-13 text-muted">
              <span className="tabular-nums">{user.employeeId}</span>
              {p.nickname ? ` · ${p.nickname}` : ""}
              {workLine ? ` · ${workLine}` : ""}
            </p>
          </div>
        </header>

        {/* gap-px บนพื้น line = เส้นแบ่งระหว่างหมวด ทั้งแบบเรียงเดี่ยวและ 2 คอลัมน์ */}
        <div className="grid gap-px border-t border-line bg-line lg:grid-cols-2">
          {sections.map((s) => (
            <section key={s.id} aria-labelledby={`profile-${s.id}`} className="flex flex-col gap-[12px] bg-white p-[20px]">
              <h3 id={`profile-${s.id}`} className="text-14 font-semibold text-ink">
                {s.title}
              </h3>
              <InfoList rows={s.rows} />
            </section>
          ))}
        </div>
      </article>

      <section aria-labelledby="profile-password" className="rounded-[10px] border border-line bg-white p-[20px]">
        <div className="flex flex-col gap-[16px] lg:flex-row lg:gap-[40px]">
          <div className="flex flex-col gap-[6px] lg:w-[280px] lg:shrink-0">
            <h3 id="profile-password" className="text-14 font-semibold text-ink">
              เปลี่ยนรหัสผ่าน
            </h3>
            <p className="text-13 text-muted">
              เปลี่ยนแล้วเครื่องอื่นที่ล็อกอินค้างไว้จะถูกออกจากระบบ ถ้าลืมรหัสผ่าน ให้ Admin อีกคนรีเซ็ตให้
            </p>
          </div>
          <div className="w-full max-w-[400px]">
            <ChangePasswordForm employeeId={user.employeeId} loginName={user.email} />
          </div>
        </div>
      </section>
    </div>
  );
}

// ป้ายชื่อคอลัมน์ซ้ายกว้างเท่ากันทุกหมวด ค่าชิดซ้ายถัดจากป้าย ไม่ต้องกวาดสายตาข้ามทั้งแถว
function InfoList({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-[16px] gap-y-[10px] text-13 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-y-[8px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-[2px] sm:contents">
          <dt className="text-muted">{label}</dt>
          <dd className={value ? "break-words font-medium text-ink" : "text-muted"}>
            {value ?? "ยังไม่ระบุ"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
