"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CircleCheck, Copy, FileDown, KeyRound, Pencil, TriangleAlert } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { ExportCsvDialog } from "@/components/ui/ExportCsvDialog";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import { table } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { cx } from "@/lib/cx";
import { formatShortThaiDate, formatThaiDate } from "@/lib/format";
import { useDetailParam } from "@/lib/useDetailParam";
import type { EmployeeProfile, OrgOption, OrgOptions } from "@/lib/auth/users";
import { deliverableEmail, type EmailDelivery, type ResetFallback } from "@/lib/email/address";
import { employmentStatusLabel } from "@/lib/employmentStatus";

type User = {
  employeeId: string; // Primary Key
  email: string; // ชื่อล็อกอิน
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  updatedAt?: string;
  hasAccount: boolean;
  profile: EmployeeProfile;
};

type Filter = "all" | "ACTIVE" | "RESIGNED";

const PAGE_SIZE = 20;


const CSV_COLUMNS = [
  "รหัสพนักงาน",
  "ชื่อ",
  "ชื่อเล่น",
  "ชื่อล็อกอิน",
  "อีเมลติดต่อ",
  "เบอร์โทร",
  "แผนก",
  "ตำแหน่ง",
  "ระดับ",
  "หัวหน้า",
  "วันเริ่มงาน",
  "บทบาท",
  "สถานะ",
  "ใช้งานล่าสุด",
];

const NO_ACCOUNT = "ยังไม่มีบัญชี";
const roleLabel = (role: string) => ROLE_LABELS[role as Role] ?? role;
const statusLabel = employmentStatusLabel;

function RoleTag({ user }: { user: Pick<User, "role" | "hasAccount"> }) {
  if (!user.hasAccount) return <Tag tone="neutral">{NO_ACCOUNT}</Tag>;
  return <Tag tone={user.role === "SUPER_ADMIN" ? "info" : "outline"}>{roleLabel(user.role)}</Tag>;
}

const joinParts = (...parts: (string | null)[]) => parts.filter(Boolean).join(" ") || null;
const addressLabel = (p: EmployeeProfile) =>
  [p.addressLine, p.subdistrict, p.district, p.province, p.postalCode].filter(Boolean).join(" ") || null;

// กดแถวแล้วเข้าหน้ารายละเอียด (?user=รหัสพนักงาน) ส่วนรายการยังอยู่เบื้องหลังเพื่อคงตัวกรองไว้
export default function AdminUsersClient({
  initialUsers,
  orgOptions,
  currentUserId,
  emailDelivery,
}: {
  initialUsers: User[];
  orgOptions: OrgOptions;
  /** ผู้ที่ล็อกอินอยู่ (รีเซ็ตรหัสของตัวเองจากหน้านี้ไม่ได้) */
  currentUserId: string;
  /** ระบบส่งอีเมลได้หรือไม่ ใช้บอกล่วงหน้าว่ารหัสชั่วคราวจะไปทางอีเมลหรือแสดงบนจอ */
  emailDelivery: EmailDelivery;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const detail = useDetailParam("user");
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const listedUsers = useMemo(() => users.filter((u) => u.status !== "DECEASED"), [users]);

  // กรองตามสถานะ + รหัสพนักงาน ชื่อ ชื่อเล่น อีเมล แผนก หรือตำแหน่ง
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    // บัญชีพนักงานที่เสียชีวิตไม่แสดงในรายชื่อและไม่นับในยอด
    return listedUsers.filter((u) => {
      if (filter !== "all" && u.status !== filter) return false;
      if (!query) return true;
      const p = u.profile;
      return [u.employeeId, u.name, u.email, p.nickname, p.contactEmail, p.departmentName, p.positionName].some((v) =>
        v?.toLowerCase().includes(query),
      );
    });
  }, [listedUsers, filter, searchQuery]);

  const rows = paginate(filteredUsers, page, PAGE_SIZE);
  const selected = users.find((u) => u.employeeId === detail.id);
  const emptyText = users.length === 0 ? "ยังไม่มีข้อมูลผู้ใช้งาน" : "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข";

  const exportCsv = () =>
    downloadCsv(
      "users.csv",
      CSV_COLUMNS,
      filteredUsers.map((u) => {
        const p = u.profile;
        return [
          u.employeeId,
          u.name,
          p.nickname ?? "",
          u.email,
          p.contactEmail ?? "",
          p.phone ?? "",
          p.departmentName ?? "",
          p.positionName ?? "",
          p.jobLevelName ?? "",
          p.managerName ?? "",
          p.hireDate ?? "",
          u.hasAccount ? roleLabel(u.role) : NO_ACCOUNT,
          statusLabel(u.status),
          u.lastLoginAt ?? "",
        ];
      }),
    );

  return (
    <>
      {selected ? (
        <div className="flex flex-col gap-[12px]">
          <Breadcrumb items={[{ label: "ตั้งค่าผู้ใช้งานระบบ", href: "/admin/users" }, { label: selected.employeeId }]} />
          <UserPanel
            key={selected.employeeId}
            user={selected}
            isSelf={selected.employeeId === currentUserId}
            emailDelivery={emailDelivery}
            orgOptions={orgOptions}
            managerChoices={users
              .filter((u) => u.status === "ACTIVE" && u.employeeId !== selected.employeeId)
              .map((u) => ({ value: u.employeeId, label: `${u.name} (${u.employeeId})` }))}
            onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.employeeId === updated.employeeId ? updated : u)))}
          />
        </div>
      ) : null}
      <div className={cx("flex flex-col gap-[24px]", selected && "hidden")}>
      <PageHeader title="ตั้งค่าผู้ใช้งานระบบ" description="จัดการบัญชี เช็คสถานะ และการเข้าใช้งาน" />
      <section aria-labelledby="user-list-title" className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]">
        <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <h2 id="user-list-title" className="text-17 font-semibold text-ink">
            รายชื่อผู้ใช้งานระบบ
          </h2>
          <Button onClick={() => setExporting(true)} disabled={filteredUsers.length === 0} className="sm:w-[200px] disabled:opacity-50">
            <FileDown className="size-4" aria-hidden="true" />
            ส่งออก CSV
          </Button>
          <ExportCsvDialog
            open={exporting}
            rowCount={filteredUsers.length}
            unit="คน"
            columns={CSV_COLUMNS}
            personalData="ชื่อ อีเมล เบอร์โทร และข้อมูลการจ้างงาน"
            onCancel={() => setExporting(false)}
            onConfirm={() => {
              exportCsv();
              setExporting(false);
            }}
          />
        </div>

        <SearchInput
          label="ค้นหาผู้ใช้"
          placeholder="ค้นหาชื่อ / รหัส / อีเมล / แผนก"
          value={searchQuery}
          onChange={(value) => {
            setSearchQuery(value);
            setPage(1);
          }}
          className="sm:max-w-[400px]"
        />

        <FilterChips
          label="กรองตามสถานะ"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          options={[
            { id: "all", label: "ทั้งหมด", count: listedUsers.length },
            ...(["ACTIVE", "RESIGNED"] as const).map((status) => ({
              id: status,
              label: statusLabel(status),
              count: users.filter((u) => u.status === status).length,
            })),
          ]}
        />

        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>รหัส</th>
                <th scope="col" className={table.th}>ชื่อ</th>
                <th scope="col" className={table.th}>แผนก / ตำแหน่ง</th>
                <th scope="col" className={table.th}>Email</th>
                <th scope="col" className={table.th}>บทบาท</th>
                <th scope="col" className={table.th}>สถานะ</th>
                <th scope="col" className={table.th}>ใช้งานล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={cx(table.td, "py-[40px] text-center text-muted")}>
                    {emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  return (
                    <tr
                      key={u.employeeId}
                      onClick={() => detail.open(u.employeeId)}
                      className={cx(table.row, "cursor-pointer", table.rowHover)}
                    >
                      <td className={cx(table.td, "font-semibold whitespace-nowrap")}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            detail.open(u.employeeId);
                          }}
                          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {u.employeeId}
                        </button>
                      </td>
                      <td className={table.td}>
                        {u.name}
                        {u.profile.nickname ? <span className="block text-12 text-muted">({u.profile.nickname})</span> : null}
                      </td>
                      <td className={table.td}>
                        {u.profile.departmentName ?? <span className="text-muted">—</span>}
                        {u.profile.positionName ? <span className="block text-12 text-muted">{u.profile.positionName}</span> : null}
                      </td>
                      <td className={cx(table.td, "break-all text-muted")}>{u.email || u.profile.contactEmail}</td>
                      <td className={table.td}>
                        <RoleTag user={u} />
                      </td>
                      <td className={table.td}>
                        <Tag tone={u.status === "ACTIVE" ? "success" : "neutral"}>{statusLabel(u.status)}</Tag>
                      </td>
                      <td className={cx(table.td, "whitespace-nowrap text-muted tabular-nums")}>
                        {u.lastLoginAt ? formatShortThaiDate(u.lastLoginAt) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {rows.length === 0 ? (
          <p className={table.cardEmpty}>{emptyText}</p>
        ) : (
          <ul className={table.cards}>
            {rows.map((u) => {
              return (
                <li key={u.employeeId}>
                  <button
                    type="button"
                    onClick={() => detail.open(u.employeeId)}
                    className={cx(table.card, table.cardButton, table.cardHover)}
                  >
                    <span className="flex items-start justify-between gap-[8px]">
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {u.name}
                          {u.profile.nickname ? <span className="font-normal text-muted"> ({u.profile.nickname})</span> : null}
                        </span>
                        <span className="block text-12 text-muted">
                          {u.employeeId}
                          {u.profile.departmentName ? `, ${u.profile.departmentName}` : ""}
                          {u.profile.positionName ? `, ${u.profile.positionName}` : ""}
                        </span>
                      </span>
                      <Tag tone={u.status === "ACTIVE" ? "success" : "neutral"}>{statusLabel(u.status)}</Tag>
                    </span>
                    <span className="mt-[6px] block break-all text-12 text-muted">{u.email || u.profile.contactEmail}</span>
                    <span className="mt-[8px] flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
                      <RoleTag user={u} />
                      <span className="ml-auto text-11 text-muted tabular-nums">
                        ใช้งานล่าสุด {u.lastLoginAt ? formatShortThaiDate(u.lastLoginAt) : "—"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-auto pt-[8px]">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filteredUsers.length} onChange={setPage} />
        </div>
      </section>
      </div>
    </>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-13 font-normal text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

type InfoRow = [label: string, value: ReactNode];

// แถวที่ยังไม่มีค่าไม่แสดงเป็น "—" ทีละบรรทัด แต่รวมชื่อไว้บรรทัดเดียวท้ายหมวด ให้หมวดสั้นลงและรู้ว่าขาดอะไร
function InfoRows({ rows }: { rows: InfoRow[] }) {
  const filled = rows.filter(([, value]) => value);
  const missing = rows.filter(([, value]) => !value).map(([label]) => label);
  return (
    <dl className="flex flex-col gap-[8px]">
      {filled.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 text-13">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className="min-w-0 break-words text-right font-medium text-ink">{value}</dd>
        </div>
      ))}
      {missing.length > 0 ? (
        <div className="text-12 text-muted">
          <dt className="sr-only">ยังไม่กรอก</dt>
          <dd>ยังไม่กรอก: {missing.join(", ")}</dd>
        </div>
      ) : null}
    </dl>
  );
}

type Choice = { value: string; label: string; disabled?: boolean };

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "date" | "select";
  options?: Choice[];
  required?: boolean;
  wide?: boolean;
  placeholder?: string;
  inputMode?: "numeric" | "tel" | "email";
  maxLength?: number;
  list?: string;
};

type Values = Record<string, string>;

type SectionId = "account" | "personal" | "family" | "contact" | "work";

/** ฟอร์มแก้ไขของแต่ละส่วน (mount ใหม่ทุกครั้งที่กดแก้ไข ค่าเริ่มต้นจึงตรงกับข้อมูลล่าสุด) */
function SectionForm({
  fields,
  initial,
  onCancel,
  onSubmit,
}: {
  fields: FieldDef[];
  initial: Values;
  onCancel: () => void;
  onSubmit: (values: Values, reason: string) => Promise<string | null>;
}) {
  const [values, setValues] = useState(initial);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = fields.some((f) => values[f.key] !== initial[f.key]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError("กรุณาระบุเหตุผลการเปลี่ยนแปลง");
      return;
    }
    // ส่งเฉพาะฟิลด์ที่เปลี่ยน
    const changed = Object.fromEntries(fields.filter((f) => values[f.key] !== initial[f.key]).map((f) => [f.key, values[f.key]]));
    setSaving(true);
    setError(null);
    const message = await onSubmit(changed, reason.trim());
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[12px]">
      <div className="grid grid-cols-2 gap-x-[8px] gap-y-[12px]">
        {fields.map((f, i) => {
          const set = (value: string) => setValues((prev) => ({ ...prev, [f.key]: value }));
          const labelText = (
            <span>
              {f.label}
              {f.required ? <span className="text-danger"> *</span> : null}
            </span>
          );
          return f.type === "select" ? (
            <div key={f.key} className={cx("flex min-w-0 flex-col gap-[6px]", f.wide && "col-span-2")}>
              <span className="text-13 font-medium text-ink" aria-hidden="true">
                {labelText}
              </span>
              <Select label={f.label} value={values[f.key]} onChange={(e) => set(e.target.value)} required={f.required}>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : (
            <label key={f.key} className={cx("flex min-w-0 flex-col gap-[6px] text-13 font-medium text-ink", f.wide && "col-span-2")}>
              {labelText}
              <input
                type={f.type ?? "text"}
                className={inputClass}
                value={values[f.key]}
                onChange={(e) => set(e.target.value)}
                required={f.required}
                placeholder={f.placeholder}
                inputMode={f.inputMode}
                maxLength={f.maxLength}
                list={f.list}
                autoFocus={i === 0}
              />
            </label>
          );
        })}
      </div>

      <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
        <span>
          เหตุผลการเปลี่ยนแปลง <span className="text-danger">*</span>
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ระบุเหตุผล เช่น ย้ายแผนก, แก้ไขเบอร์โทร"
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-13 font-normal text-ink placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      {error ? (
        <p role="alert" className="text-12 text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-[8px]">
        <Button onClick={onCancel} disabled={saving}>
          ยกเลิก
        </Button>
        <Button type="submit" variant="primary" loading={saving} disabled={!dirty} className="disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}

const EMPTY_CHOICE: Choice = { value: "", label: "— ไม่ระบุ —" };
// ค่าเดียวกับฟอร์มเพิ่มพนักงานของ HR
const GENDER_OPTIONS = ["ชาย", "หญิง", "ไม่ระบุ"];
const MARITAL_OPTIONS = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];
const withEmpty = (options: string[]): Choice[] => [EMPTY_CHOICE, ...options.map((value) => ({ value, label: value }))];

/** ตัวเลือก dropdown + ค่าปัจจุบัน (กรณีถูกปิดใช้งานแล้ว) เพื่อไม่ให้ค่าเดิมหายไปเงียบ ๆ */
function toChoices(options: OrgOption[], currentId: string | null, currentName: string | null): Choice[] {
  const choices = options.map((o) => ({ value: o.id, label: o.name }));
  if (currentId && !options.some((o) => o.id === currentId)) {
    choices.unshift({ value: currentId, label: `${currentName ?? currentId} (ปิดใช้งาน)` });
  }
  return [EMPTY_CHOICE, ...choices];
}

/** หน้ารายละเอียดผู้ใช้ แต่ละส่วนแก้ไขแยกกัน (แก้ได้ทีละส่วน) */
function UserPanel({
  user,
  isSelf,
  emailDelivery,
  orgOptions,
  managerChoices,
  onSaved,
}: {
  user: User;
  isSelf: boolean;
  emailDelivery: EmailDelivery;
  orgOptions: OrgOptions;
  managerChoices: Choice[];
  onSaved: (user: User) => void;
}) {
  const [editing, setEditing] = useState<SectionId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const save = async (section: SectionId, values: Values, reason: string): Promise<string | null> => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: user.employeeId, section, values, reason }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) return result.error || "บันทึกไม่สำเร็จ";
      onSaved(result.user ?? { ...user, updatedAt: result.updatedAt || new Date().toISOString() });
      setEditing(null);
      setNotice("บันทึกการเปลี่ยนแปลงแล้ว");
      return null;
    } catch {
      return "เกิดข้อผิดพลาดในการบันทึก";
    }
  };

  const p = user.profile;
  const initial = Array.from((p.firstNameTh ?? user.name).trim())[0] ?? "?";
  const workLine = [p.positionName, p.departmentName].filter(Boolean).join(", ");
  const managerLabel = p.managerName ? `${p.managerName}${p.managerCode ? ` (${p.managerCode})` : ""}` : null;
  const emergencyLabel = joinParts(p.emergencyContactName, p.emergencyContactPhone && `(${p.emergencyContactPhone})`);
  const endDate = user.status === "DECEASED" ? p.deceasedDate : p.resignedDate;

  const statusChoices: Choice[] = [
    { value: "ACTIVE", label: "ทำงานอยู่" },
    { value: "RESIGNED", label: "ลาออก" },
    ...(user.status === "DECEASED" ? [{ value: "DECEASED", label: "เสียชีวิต", disabled: true }] : []),
  ];
  const managers =
    p.managerCode && !managerChoices.some((m) => m.value === p.managerCode)
      ? [{ value: p.managerCode, label: managerLabel ?? p.managerCode }, ...managerChoices]
      : managerChoices;

  const sections: { id: SectionId; title: string; rows: InfoRow[]; fields: FieldDef[]; initial: Values }[] = [
    {
      id: "account",
      title: "บัญชีเข้าใช้งาน",
      rows: user.hasAccount
        ? [
            ["ชื่อล็อกอิน", <span key="email" className="break-all">{user.email}</span>],
            ["บทบาท", <RoleTag key="role" user={user} />],
            ["สถานะ", statusLabel(user.status)],
            ["ใช้งานล่าสุด", user.lastLoginAt ? formatShortThaiDate(user.lastLoginAt) : null],
          ]
        : [
            ["บัญชีเข้าใช้งาน", <RoleTag key="role" user={user} />],
            ["สถานะ", statusLabel(user.status)],
          ],
      fields: [
        { key: "email", label: "ชื่อล็อกอิน / อีเมล", required: true, wide: true },
        { key: "role", label: "บทบาท", type: "select", wide: true, options: ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })) },
        { key: "status", label: "สถานะ", type: "select", wide: true, options: statusChoices },
      ],
      initial: { email: user.email, role: user.role, status: user.status },
    },
    {
      id: "personal",
      title: "ข้อมูลส่วนตัว",
      rows: [
        ["ชื่อ (ไทย)", joinParts(p.titleTh, p.firstNameTh, p.lastNameTh)],
        ["ชื่อ (อังกฤษ)", joinParts(p.firstNameEn, p.lastNameEn)],
        ["ชื่อเล่น", p.nickname],
        ["เพศ", p.gender],
        ["วันเกิด", p.birthDate ? formatThaiDate(p.birthDate) : null],
        ["เลขบัตรประชาชน", p.citizenIdMasked],
        ["สัญชาติ", p.nationality],
        ["ศาสนา", p.religion],
      ],
      fields: [
        { key: "titleTh", label: "คำนำหน้า", list: "title-th-options", placeholder: "นาย / นาง / นางสาว" },
        { key: "nickname", label: "ชื่อเล่น" },
        { key: "firstNameTh", label: "ชื่อ (ไทย)", required: true },
        { key: "lastNameTh", label: "นามสกุล (ไทย)", required: true },
        { key: "firstNameEn", label: "ชื่อ (อังกฤษ)" },
        { key: "lastNameEn", label: "นามสกุล (อังกฤษ)" },
        { key: "gender", label: "เพศ", type: "select", options: withEmpty(GENDER_OPTIONS) },
        { key: "birthDate", label: "วันเกิด", type: "date" },
        // เลขเต็มไม่ถูกส่งมาหน้าเว็บ เว้นว่างไว้คือไม่เปลี่ยน
        { key: "citizenId", label: "เลขบัตรประชาชน", inputMode: "numeric", maxLength: 13, wide: true, placeholder: p.citizenIdMasked ?? "ตัวเลข 13 หลัก" },
        { key: "nationality", label: "สัญชาติ" },
        { key: "religion", label: "ศาสนา" },
      ],
      initial: {
        titleTh: p.titleTh ?? "",
        nickname: p.nickname ?? "",
        firstNameTh: p.firstNameTh ?? "",
        lastNameTh: p.lastNameTh ?? "",
        firstNameEn: p.firstNameEn ?? "",
        lastNameEn: p.lastNameEn ?? "",
        gender: p.gender ?? "",
        birthDate: p.birthDate ?? "",
        citizenId: "",
        nationality: p.nationality ?? "",
        religion: p.religion ?? "",
      },
    },
    {
      id: "family",
      title: "ครอบครัว",
      rows: [
        ["สถานะสมรส", p.maritalStatus],
        ["จำนวนบุตร", p.childrenCount === null ? null : String(p.childrenCount)],
        ["บิดา", joinParts(p.fatherFirstName, p.fatherLastName)],
        ["มารดา", joinParts(p.motherFirstName, p.motherLastName)],
      ],
      fields: [
        { key: "maritalStatus", label: "สถานะสมรส", type: "select", options: withEmpty(MARITAL_OPTIONS) },
        { key: "childrenCount", label: "จำนวนบุตร", inputMode: "numeric" },
        { key: "fatherFirstName", label: "ชื่อบิดา" },
        { key: "fatherLastName", label: "นามสกุลบิดา" },
        { key: "motherFirstName", label: "ชื่อมารดา" },
        { key: "motherLastName", label: "นามสกุลมารดา" },
      ],
      initial: {
        maritalStatus: p.maritalStatus ?? "",
        childrenCount: p.childrenCount === null ? "" : String(p.childrenCount),
        fatherFirstName: p.fatherFirstName ?? "",
        fatherLastName: p.fatherLastName ?? "",
        motherFirstName: p.motherFirstName ?? "",
        motherLastName: p.motherLastName ?? "",
      },
    },
    {
      id: "contact",
      title: "ติดต่อ",
      rows: [
        ["อีเมลติดต่อ", p.contactEmail],
        ["เบอร์โทร", p.phone],
        ["ผู้ติดต่อฉุกเฉิน", emergencyLabel],
        ["ที่อยู่", addressLabel(p)],
      ],
      fields: [
        { key: "contactEmail", label: "อีเมลติดต่อ", type: "email", required: true, wide: true },
        { key: "phone", label: "เบอร์โทร", type: "tel", inputMode: "tel", wide: true },
        { key: "emergencyContactName", label: "ผู้ติดต่อฉุกเฉิน" },
        { key: "emergencyContactPhone", label: "เบอร์ฉุกเฉิน", type: "tel", inputMode: "tel" },
        { key: "addressLine", label: "ที่อยู่", wide: true, placeholder: "บ้านเลขที่ ถนน ซอย" },
        { key: "subdistrict", label: "ตำบล/แขวง" },
        { key: "district", label: "อำเภอ/เขต" },
        { key: "province", label: "จังหวัด" },
        { key: "postalCode", label: "รหัสไปรษณีย์", inputMode: "numeric", maxLength: 5 },
      ],
      initial: {
        contactEmail: p.contactEmail ?? "",
        phone: p.phone ?? "",
        emergencyContactName: p.emergencyContactName ?? "",
        emergencyContactPhone: p.emergencyContactPhone ?? "",
        addressLine: p.addressLine ?? "",
        subdistrict: p.subdistrict ?? "",
        district: p.district ?? "",
        province: p.province ?? "",
        postalCode: p.postalCode ?? "",
      },
    },
    {
      id: "work",
      title: "การทำงาน",
      rows: [
        ["แผนก", p.departmentName],
        ["ตำแหน่ง", p.positionName],
        ["ระดับ", p.jobLevelName],
        ["หัวหน้า", managerLabel],
        ["วันเริ่มงาน", p.hireDate ? formatThaiDate(p.hireDate) : null],
        ...(endDate
          ? ([
              [user.status === "DECEASED" ? "วันที่เสียชีวิต" : "วันที่ลาออก", formatThaiDate(endDate)],
              ["เหตุผล", p.statusReason],
            ] as InfoRow[])
          : []),
      ],
      fields: [
        { key: "departmentId", label: "แผนก", type: "select", wide: true, options: toChoices(orgOptions.departments, p.departmentId, p.departmentName) },
        { key: "positionId", label: "ตำแหน่ง", type: "select", wide: true, options: toChoices(orgOptions.positions, p.positionId, p.positionName) },
        { key: "jobLevelId", label: "ระดับ", type: "select", options: toChoices(orgOptions.jobLevels, p.jobLevelId, p.jobLevelName) },
        { key: "hireDate", label: "วันเริ่มงาน", type: "date", required: true },
        { key: "managerCode", label: "หัวหน้า", type: "select", wide: true, options: [EMPTY_CHOICE, ...managers] },
      ],
      initial: {
        departmentId: p.departmentId ?? "",
        positionId: p.positionId ?? "",
        jobLevelId: p.jobLevelId ?? "",
        hireDate: p.hireDate ?? "",
        managerCode: p.managerCode ?? "",
      },
    },
  ];

  const renderSection = (s: (typeof sections)[number]) => {
    const isEditing = editing === s.id;
    return (
      <section
        key={s.id}
        aria-label={s.title}
        className={cx(
          "flex flex-col gap-[10px] border-t border-line pt-[14px]",
          editing && !isEditing && "opacity-60",
        )}
      >
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2 className="text-13 font-semibold text-ink">{s.title}</h2>
          {isEditing ? (
            <span className="text-12 text-primary-700">กำลังแก้ไข</span>
          ) : s.id === "account" && !user.hasAccount ? null : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setNotice(null);
                setEditing(s.id);
              }}
              disabled={editing !== null}
              aria-label={`แก้ไข${s.title}`}
              className="disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="size-3.5" aria-hidden="true" />
              แก้ไข
            </Button>
          )}
        </div>
        {isEditing ? (
          <SectionForm
            fields={s.fields}
            initial={s.initial}
            onCancel={() => setEditing(null)}
            onSubmit={(values, reason) => save(s.id, values, reason)}
          />
        ) : (
          <InfoRows rows={s.rows} />
        )}
      </section>
    );
  };

  return (
    <article
      aria-labelledby="user-panel-title"
      className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[16px] sm:p-[20px]"
    >
      <header className="flex items-start gap-[12px]">
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-18 font-semibold text-primary-700"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 id="user-panel-title" className="min-w-0 break-words text-22 font-semibold text-ink">
              {user.name}
            </h1>
            <Tag tone={user.status === "ACTIVE" ? "success" : "neutral"} className="shrink-0">
              {statusLabel(user.status)}
            </Tag>
          </div>
          <p className="mt-[2px] text-12 text-muted tabular-nums">
            {user.employeeId}
            {p.nickname ? ` (${p.nickname})` : ""}
          </p>
          {workLine ? <p className="text-12 text-muted">{workLine}</p> : null}
        </div>
      </header>

      {notice && !editing ? (
        <p role="status" className="rounded-lg bg-surface px-3 py-2 text-12 text-ok">
          {notice}
        </p>
      ) : null}

      <datalist id="title-th-options">
        <option value="นาย" />
        <option value="นาง" />
        <option value="นางสาว" />
      </datalist>

      <div className="grid grid-cols-1 gap-[16px] lg:grid-cols-2 lg:gap-x-[40px]">
        <div className="flex min-w-0 flex-col gap-[16px]">{sections.slice(0, 3).map(renderSection)}</div>
        <div className="flex min-w-0 flex-col gap-[16px]">
          {sections.slice(3).map(renderSection)}
          <ResetPasswordSection user={user} isSelf={isSelf} emailDelivery={emailDelivery} dimmed={editing !== null} onIssued={onSaved} />
        </div>
      </div>
    </article>
  );
}

/**
 * รีเซ็ตรหัสผ่าน (พนักงานลืมรหัส → HR/IT ยืนยันตัวตนแล้ว → Admin ออกรหัสชั่วคราว)
 * ทำใน dialog แบบ modal: ระหว่างเปิดอยู่ออกจากหน้านี้หรือเปิดฟอร์มอื่นไม่ได้
 * รหัสชั่วคราวจึงไม่หายเพราะเผลอคลิกที่อื่น ปิดแล้วดูซ้ำไม่ได้ พนักงานต้องตั้งรหัสใหม่ตอนล็อกอิน
 */
function ResetPasswordSection({
  user,
  isSelf,
  emailDelivery,
  dimmed,
  onIssued,
}: {
  user: User;
  isSelf: boolean;
  emailDelivery: EmailDelivery;
  dimmed: boolean;
  onIssued: (user: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const hintId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const issuing = !user.hasAccount;
  const loginEmail = deliverableEmail(user.profile.contactEmail);

  const blocked = issuing
    ? user.status !== "ACTIVE"
      ? "ออกบัญชีได้เฉพาะพนักงานที่ยังทำงานอยู่"
      : !loginEmail
        ? "พนักงานคนนี้ยังไม่มีอีเมลที่ใช้เป็นชื่อล็อกอินได้ ให้แก้อีเมลติดต่อก่อน"
        : null
    : isSelf
    ? "รหัสผ่านของตัวเองให้เปลี่ยนที่หน้าโปรไฟล์"
    : user.status !== "ACTIVE"
      ? "รีเซ็ตได้เฉพาะบัญชีที่ยังทำงานอยู่"
      : null;

  return (
    <section
      aria-label="รหัสผ่าน"
      className={cx("flex flex-col gap-[10px] border-t border-line pt-[14px]", dimmed && "opacity-60")}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-13 font-semibold text-ink">รหัสผ่าน</h2>
        <Button
          size="sm"
          ref={triggerRef}
          variant={issuing ? "primary" : "danger-outline"}
          onClick={() => setOpen(true)}
          disabled={dimmed || blocked !== null}
          aria-describedby={hintId}
          className="disabled:cursor-not-allowed disabled:opacity-40"
        >
          <KeyRound className="size-3.5" aria-hidden="true" />
          {issuing ? "ออกบัญชี" : "รีเซ็ตรหัสผ่าน"}
        </Button>
      </div>
      <p id={hintId} className="text-12 text-muted">
        {blocked ??
          (issuing
            ? `พนักงานยังล็อกอินไม่ได้ กดเพื่อสร้างบัญชีโดยใช้ ${loginEmail} เป็นชื่อล็อกอิน`
            : "ใช้เมื่อพนักงานลืมรหัสผ่าน ยืนยันตัวตนกับพนักงานก่อนรีเซ็ตทุกครั้ง")}
      </p>

      {open ? (
        <ResetPasswordDialog
          user={user}
          emailDelivery={emailDelivery}
          onIssued={onIssued}
          onClose={() => {
            setOpen(false);
            // Safari ไม่โฟกัสปุ่มตอนคลิก dialog จึงคืนโฟกัสเองไม่ได้ ส่งโฟกัสกลับปุ่มรีเซ็ตเสมอ
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </section>
  );
}

function ResetPasswordDialog({
  user,
  emailDelivery,
  onIssued,
  onClose,
}: {
  user: User;
  emailDelivery: EmailDelivery;
  onIssued: (user: User) => void;
  onClose: () => void;
}) {
  // พนักงานที่ยังไม่มีบัญชี dialog นี้ทำหน้าที่ออกบัญชีแทนการรีเซ็ต (ขั้นตอนแสดงรหัสชั่วคราวเหมือนกัน)
  const issuing = !user.hasAccount;
  const [issuedUser, setIssuedUser] = useState<User | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const resultRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const ackId = useId();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [emailedTo, setEmailedTo] = useState<string | null>(null);
  const [fallback, setFallback] = useState<ResetFallback | null>(null);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const done = tempPassword !== null || emailedTo !== null;
  // รหัสบนจอแสดงครั้งเดียว: ปิดได้เมื่อคัดลอกแล้วหรือยืนยันว่าแจ้งพนักงานแล้วเท่านั้น
  const mustAcknowledge = tempPassword !== null && !copied && !acknowledged;
  const canDismiss = !saving && !mustAcknowledge;

  // เปิดเป็น modal ตอน mount: โฟกัสอยู่ใน dialog, พื้นหลังกดไม่ได้, ปิดแล้วโฟกัสกลับไปที่ปุ่มที่เปิด
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    reasonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // ผลลัพธ์มาแทนฟอร์ม: ย้ายโฟกัสไปที่ปุ่มหลักของผลลัพธ์ ไม่ให้หลุดไปที่ <body>
  useEffect(() => {
    if (done) resultRef.current?.focus();
  }, [done]);

  // ปิดด้วย close() ก่อน unmount: เบราว์เซอร์คืนโฟกัสให้ปุ่มที่เปิด dialog ได้ (ถ้าถอด node ทิ้งเลย โฟกัสจะหลุดไป <body>)
  const dismiss = () => {
    ref.current?.close();
    onClose();
    // อัปเดตข้อมูลหลังปิด ไม่ให้หน้าเปลี่ยนสถานะระหว่างที่รหัสชั่วคราวยังแสดงอยู่
    if (issuedUser) onIssued(issuedUser);
  };

  const requestClose = () => {
    if (canDismiss) dismiss();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!reason.trim()) {
      setError(issuing ? "กรุณาระบุเหตุผลการออกบัญชี" : "กรุณาระบุเหตุผลการรีเซ็ตรหัสผ่าน");
      reasonRef.current?.focus();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(issuing ? "/api/admin/users/issue-account" : "/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: user.employeeId, reason: reason.trim() }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !(result.tempPassword || result.emailedTo)) {
        setError(result.error || (issuing ? "ออกบัญชีไม่สำเร็จ" : "รีเซ็ตรหัสผ่านไม่สำเร็จ"));
      } else {
        setTempPassword(result.tempPassword ?? null);
        setEmailedTo(result.emailedTo ?? null);
        setFallback(result.fallback ?? null);
        if (issuing) setIssuedUser(result.user ?? { ...user, hasAccount: true, email: user.profile.contactEmail ?? "" });
      }
    } catch {
      setError(issuing ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาโหลดหน้าใหม่เพื่อตรวจว่าออกบัญชีแล้วหรือยัง" : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ รหัสผ่านยังไม่ถูกรีเซ็ต ลองอีกครั้ง");
    }
    setSaving(false);
  };

  const copy = async () => {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  // บอกล่วงหน้าตามที่ server จะทำจริง (กติกาเดียวกับ API) ไม่สัญญาว่าจะส่งอีเมลเมื่อระบบส่งไม่ได้
  const contactEmail = deliverableEmail(user.profile.contactEmail);
  const deliveryPlan = !contactEmail
    ? "พนักงานไม่มีอีเมลติดต่อ ระบบจะแสดงรหัสชั่วคราวบนจอครั้งเดียว ให้คุณแจ้งพนักงานเอง"
    : !emailDelivery.configured
      ? "ระบบยังไม่ได้ตั้งค่าการส่งอีเมล จึงจะแสดงรหัสชั่วคราวบนจอครั้งเดียว ให้คุณแจ้งพนักงานเอง"
      : emailDelivery.testTo
        ? `โหมดทดสอบ: ระบบจะส่งรหัสชั่วคราวไปที่ ${emailDelivery.testTo} แทน ${contactEmail} ถ้าส่งไม่สำเร็จจะแสดงรหัสบนจอแทน`
        : `ระบบจะส่งรหัสชั่วคราวไปที่ ${contactEmail} ถ้าส่งไม่สำเร็จจะแสดงรหัสบนจอแทน`;

  const title = tempPassword
    ? `รหัสผ่านชั่วคราวของ ${user.name}`
    : emailedTo
      ? "ส่งรหัสผ่านชั่วคราวแล้ว"
      : issuing
        ? `ออกบัญชีให้ ${user.name}?`
        : `รีเซ็ตรหัสผ่านของ ${user.name}?`;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        // จัดการ Esc เอง: Chrome ปิด dialog ได้ถ้ากด Esc ซ้ำติดกัน แม้ onCancel จะสั่ง preventDefault
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // ถ้าเบราว์เซอร์ปิด dialog เองทั้งที่ยังปิดไม่ได้ ให้เปิดกลับ ไม่ทิ้งรหัสที่ดูซ้ำไม่ได้
        if (!canDismiss && ref.current && !ref.current.open) ref.current.showModal();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[440px] overflow-y-auto rounded-[10px] border border-line bg-white p-0 text-ink shadow-lg backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-[16px] p-[20px]">
        <div className="flex flex-col gap-[4px]">
          <h2 id={titleId} className="flex items-start gap-[8px] break-words text-17 font-semibold">
            {emailedTo && !tempPassword ? (
              <CircleCheck className="mt-[3px] size-[18px] shrink-0 text-status-approved-ink" aria-hidden="true" />
            ) : null}
            <span className="min-w-0">{title}</span>
          </h2>
          {!done ? (
            <p className="break-words text-13 text-muted">
              {user.employeeId}, {user.email || user.profile.contactEmail}
            </p>
          ) : null}
        </div>

        {!done ? (
          <form onSubmit={submit} noValidate className="flex flex-col gap-[16px]">
            <ul className="list-disc space-y-[2px] pl-[18px] text-13 text-muted">
              {issuing ? <li className="break-words">ใช้ {contactEmail} เป็นชื่อล็อกอิน บทบาทเริ่มต้นเป็นพนักงาน</li> : null}
              <li className="break-words">{deliveryPlan}</li>
              <li>{user.name} ต้องตั้งรหัสใหม่ตอนล็อกอินครั้งถัดไป</li>
              {issuing ? null : <li>ทุกเครื่องที่ล็อกอินค้างไว้จะถูกออกจากระบบ</li>}
            </ul>
            <label className="flex flex-col gap-[6px] text-13 font-medium text-ink">
              <span>
                {issuing ? "เหตุผลการออกบัญชี" : "เหตุผลการรีเซ็ต"} <span className="text-danger">*</span>
              </span>
              <textarea
                ref={reasonRef}
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={500}
                aria-required="true"
                aria-invalid={error ? true : undefined}
                placeholder={issuing ? "เช่น พนักงานใหม่เริ่มงาน" : "เช่น พนักงานลืมรหัสผ่าน ยืนยันตัวตนด้วยบัตรพนักงานแล้ว"}
                className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-13 font-normal text-ink placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 aria-[invalid=true]:border-danger"
              />
            </label>
            {error ? (
              <p role="alert" className="text-12 text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex flex-col-reverse gap-[8px] sm:flex-row sm:justify-end">
              <Button onClick={requestClose} disabled={saving}>
                ยกเลิก
              </Button>
              <Button type="submit" variant={issuing ? "primary" : "danger"} loading={saving}>
                {issuing ? (saving ? "กำลังออกบัญชี…" : "ออกบัญชี") : saving ? "กำลังรีเซ็ต…" : "รีเซ็ตรหัสผ่าน"}
              </Button>
            </div>
          </form>
        ) : null}

        {emailedTo && !tempPassword ? (
          <div role="status" className="flex flex-col gap-[16px]">
            <p className="break-words text-13 text-muted">
              {emailDelivery.testTo ? (
                <>
                  โหมดทดสอบ: ส่งไปที่ <span className="font-medium text-ink">{emailedTo}</span> แทนอีเมลของ {user.name}{" "}
                  พนักงานจะไม่ได้รับอีเมลนี้ ให้แจ้งรหัสจากกล่องจดหมายทดสอบเอง
                </>
              ) : (
                <>
                  ส่งไปที่ <span className="font-medium text-ink">{emailedTo}</span> ให้ {user.name} เช็กอีเมล (รวมถึงโฟลเดอร์สแปม)
                  แล้วล็อกอินเพื่อตั้งรหัสใหม่ ถ้าไม่ได้รับอีเมล ให้รีเซ็ตรหัสผ่านจากหน้านี้
                </>
              )}
            </p>
            <div className="flex flex-col sm:flex-row sm:justify-end">
              <Button ref={resultRef} variant="primary" onClick={dismiss}>
                เสร็จสิ้น
              </Button>
            </div>
          </div>
        ) : null}

        {tempPassword ? (
          <div role="status" className="flex flex-col gap-[12px]">
            {fallback === "send-failed" ? (
              <div className="flex gap-[8px] rounded-[8px] bg-status-pending-soft px-[10px] py-[8px] text-13 text-status-pending-ink">
                <TriangleAlert className="mt-[2px] size-[14px] shrink-0" aria-hidden="true" />
                <p className="break-words">
                  ส่งอีเมลไปที่ {emailDelivery.testTo ?? contactEmail} ไม่สำเร็จ {issuing ? "สร้างบัญชีแล้ว" : "รหัสผ่านถูกรีเซ็ตแล้ว"} ให้แจ้งรหัสด้านล่างกับพนักงานเอง
                </p>
              </div>
            ) : null}
            <div className="flex items-center gap-[8px]">
              <code className="min-w-0 flex-1 select-all break-all rounded-md border border-line bg-surface px-3 py-2 font-mono text-14 tracking-wider text-ink">
                {tempPassword}
              </code>
              <Button ref={resultRef} size="sm" onClick={copy} aria-label="คัดลอกรหัสผ่านชั่วคราว">
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </Button>
            </div>
            <p className="text-12 text-muted">
              แจ้งรหัสนี้กับพนักงานโดยตรง ห้ามส่งในแชตกลุ่ม ปิดกล่องนี้แล้วจะดูรหัสซ้ำไม่ได้ ถ้าทำหายต้องรีเซ็ตรหัสผ่านใหม่
            </p>
            <label className="flex items-start gap-[8px] text-13 text-ink">
              <input
                type="checkbox"
                checked={acknowledged || copied}
                disabled={copied}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-[3px] size-4 shrink-0 accent-primary-600"
              />
              <span>แจ้งหรือจดรหัสนี้ให้พนักงานแล้ว</span>
            </label>
            <div className="flex flex-col gap-[6px] sm:items-end">
              <Button
                variant="primary"
                onClick={dismiss}
                disabled={mustAcknowledge}
                aria-describedby={mustAcknowledge ? ackId : undefined}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                เสร็จสิ้น
              </Button>
              {mustAcknowledge ? (
                <p id={ackId} className="text-12 text-muted">
                  คัดลอกรหัส หรือติ๊กยืนยันก่อนปิด
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </dialog>
  );
}
