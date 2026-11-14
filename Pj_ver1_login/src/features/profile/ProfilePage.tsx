import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, Pencil } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { Tag } from "@/components/ui/Tag";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import type { EmployeeProfile, UserWithProfile } from "@/lib/auth/users";
import type { EmployeeBenefit } from "@/lib/claims/types";
import type { MyProfile } from "@/lib/employee/profile";
import { formatBahtWhole, formatThaiDate } from "@/lib/format";
import { EMPLOYMENT_STATUS_LABELS } from "@/lib/employmentStatus";

const STATUS_LABELS = EMPLOYMENT_STATUS_LABELS;

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

// โปรไฟล์อ่านอย่างเดียว: หัวโปรไฟล์ + หมวดข้อมูล (ส่วนตัว / ติดต่อ / การทำงาน / บัญชี / สวัสดิการของฉัน) เรียง 2 คอลัมน์บนจอกว้าง
// ชิดซ้ายเหมือนหน้า Admin อื่น หัวข้อหน้าจะได้อยู่ตำแหน่งเดิมเมื่อสลับเมนู
export function ProfilePage({
  user,
  fallbackName,
  lastEdit = null,
  benefits = null,
  bankAccount = null,
  recentLogins = [],
}: {
  user: UserWithProfile | null;
  fallbackName: string;
  lastEdit?: MyProfile["lastEdit"];
  benefits?: EmployeeBenefit[] | null;
  bankAccount?: { bankCode: string; accountMasked: string } | null;
  recentLogins?: { at: string; ip: string | null }[];
}) {
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
  const workLine = [p.positionName, p.departmentName].filter(Boolean).join(", ");
  const tenure = p.hireDate && user.status === "ACTIVE" ? tenureLabel(p.hireDate) : null;
  const endDate = user.status === "DECEASED" ? p.deceasedDate : p.resignedDate;

  const totalLimit = benefits ? benefits.reduce((sum, item) => sum + item.limit, 0) : null;
  const totalRemaining = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const totalClaims = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;

  const sections: { id: string; title: string; rows: InfoRow[] }[] = [
    {
      id: "personal",
      title: "ข้อมูลส่วนตัวและครอบครัว",
      rows: [
        ["ชื่อ (ไทย)", joinParts(p.titleTh, p.firstNameTh, p.lastNameTh)],
        ["ชื่อ (อังกฤษ)", joinParts(p.firstNameEn, p.lastNameEn)],
        ["ชื่อเล่น", p.nickname],
        ["สถานะสมรส", p.maritalStatus],
        ["จำนวนบุตร", p.childrenCount === null ? null : `${p.childrenCount} คน`],
      ],
    },
    {
      id: "contact",
      title: "ติดต่อ",
      rows: [
        ["อีเมลติดต่อ", p.contactEmail],
        ["เบอร์โทร", p.phone],
        ["ผู้ติดต่อฉุกเฉิน", joinParts(p.emergencyContactName, p.emergencyContactPhone && `(${p.emergencyContactPhone})`)],
        ["ที่อยู่", addressLabel(p)],
      ],
    },
    {
      id: "work",
      title: "การทำงาน",
      rows: [
        ["รหัสพนักงาน", <span key="code" className="tabular-nums">{user.employeeId}</span>],
        ["แผนก", p.departmentName],
        ["ตำแหน่ง", p.positionName],
        ["ระดับ", p.jobLevelName],
        ["หัวหน้า", p.managerName ? `${p.managerName}${p.managerCode ? ` (${p.managerCode})` : ""}` : null],
        [
          "วันเริ่มงาน",
          p.hireDate ? (
            <>
              {formatThaiDate(p.hireDate)}
              {tenure ? <span className="font-normal text-muted"> (อายุงาน {tenure})</span> : null}
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
      title: "บัญชีผู้ใช้งานและประวัติล่าสุด",
      rows: [
        ["ชื่อล็อกอิน", user.email],
        ["บทบาท", ROLE_LABELS[user.role as Role] ?? user.role],
        ["เข้าสู่ระบบล่าสุด", user.lastLoginAt ? <span key="login" className="tabular-nums">{formatDateTime(user.lastLoginAt)}</span> : null],
        ...(recentLogins.length > 0
          ? ([
              [
                "ประวัติล็อกอิน",
                <ul key="logins" className="flex flex-col gap-[2px] text-12 font-normal text-muted tabular-nums">
                  {recentLogins.map((item, idx) => (
                    <li key={`${item.at}-${idx}`}>
                      {formatDateTime(item.at)}
                      {item.ip ? ` · IP ${item.ip}` : ""}
                    </li>
                  ))}
                </ul>,
              ],
            ] as InfoRow[])
          : []),
        [
          "แก้ไขโปรไฟล์ล่าสุด",
          lastEdit ? (
            <span key="lastEdit" className="flex flex-col gap-[2px]">
              <span className="tabular-nums">{lastEdit.at}</span>
              <span className="text-12 font-normal text-muted">
                โดย {lastEdit.editorName ?? "ระบบ"}
                {lastEdit.editorPosition ? ` (${lastEdit.editorPosition})` : ""}
                {lastEdit.reason ? ` · เหตุผล: ${lastEdit.reason}` : ""}
              </span>
            </span>
          ) : user.updatedAt ? (
            <span key="upd" className="tabular-nums">{formatDateTime(user.updatedAt)}</span>
          ) : null,
        ],
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
              {p.nickname ? ` (${p.nickname})` : ""}
              {workLine ? `, ${workLine}` : ""}
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

        {/* สิทธิ์สวัสดิการของฉันและบัญชีรับเงินสวัสดิการ (เชื่อมข้อมูลเดียวกับหน้าผู้ส่งคำขอและ HR) */}
        <section aria-labelledby="profile-welfare" className="border-t border-line p-[20px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="profile-welfare" className="text-14 font-semibold text-ink">
              สวัสดิการของฉันและบัญชีรับเงิน
            </h3>
            <Link
              href="/employee"
              className="inline-flex items-center gap-1.5 text-13 font-medium text-primary-700 hover:underline"
            >
              ไปหน้ายื่นคำขอสวัสดิการของฉัน
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-[12px] grid grid-cols-1 gap-x-[40px] gap-y-[10px] lg:grid-cols-2">
            <InfoList
              rows={[
                [
                  "วงเงินคงเหลือปีนี้",
                  totalRemaining !== null && totalLimit !== null ? (
                    <span key="rem" className="tabular-nums">
                      {formatBahtWhole(totalRemaining)}{" "}
                      <span className="font-normal text-muted">จาก {formatBahtWhole(totalLimit)}</span>
                    </span>
                  ) : null,
                ],
                [
                  "จำนวนครั้งที่เบิกปีนี้",
                  totalClaims !== null ? <span key="cnt" className="tabular-nums">{totalClaims} ครั้ง</span> : null,
                ],
              ]}
            />
            <InfoList
              rows={[
                [
                  "บัญชีรับเงินสวัสดิการ",
                  bankAccount ? `${bankAccount.bankCode} · ${bankAccount.accountMasked}` : null,
                ],
                [
                  "จำนวนสวัสดิการที่มีสิทธิ์",
                  benefits ? <span key="ben" className="tabular-nums">{benefits.length} รายการ</span> : null,
                ],
              ]}
            />
          </div>
        </section>

        {/* รหัสผ่านอยู่ในแผ่นเดียวกับโปรไฟล์ คั่นด้วยเส้น ไม่แยกเป็นกล่องใหม่ */}
        <section aria-labelledby="profile-password" className="border-t border-line p-[20px]">
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
      </article>
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
