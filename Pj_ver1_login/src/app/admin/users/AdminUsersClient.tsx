"use client";

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { FileDown, Pencil } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { FilterChips } from "@/components/ui/FilterChips";
import { Pagination, paginate } from "@/components/ui/Pagination";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import { table } from "@/components/ui/table";
import { downloadCsv } from "@/lib/csv";
import { cx } from "@/lib/cx";
import { formatShortThaiDate, formatThaiDate } from "@/lib/format";
import type { EmployeeProfile, OrgOption, OrgOptions } from "@/lib/auth/users";

type User = {
  employeeId: string; // Primary Key
  email: string; // ชื่อล็อกอิน
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  updatedAt?: string;
  profile: EmployeeProfile;
};

type Filter = "all" | "ACTIVE" | "RESIGNED";

const PAGE_SIZE = 7;

const STATUS_LABELS: Record<string, string> = { ACTIVE: "ทำงานอยู่", RESIGNED: "ลาออก", DECEASED: "เสียชีวิต" };

const roleLabel = (role: string) => ROLE_LABELS[role as Role] ?? role;
const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

const joinParts = (...parts: (string | null)[]) => parts.filter(Boolean).join(" ") || null;
const addressLabel = (p: EmployeeProfile) =>
  [p.addressLine, p.subdistrict, p.district, p.province, p.postalCode].filter(Boolean).join(" ") || null;

// Layout follows Figma "Admin / ผู้ใช้งาน" (node 163:643): user list + account detail card.
export default function AdminUsersClient({ initialUsers, orgOptions }: { initialUsers: User[]; orgOptions: OrgOptions }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(initialUsers[0]?.employeeId ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // กรองตามสถานะ + รหัสพนักงาน ชื่อ ชื่อเล่น อีเมล แผนก หรือตำแหน่ง
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && u.status !== filter) return false;
      if (!query) return true;
      const p = u.profile;
      return [u.employeeId, u.name, u.email, p.nickname, p.contactEmail, p.departmentName, p.positionName].some((v) =>
        v?.toLowerCase().includes(query),
      );
    });
  }, [users, filter, searchQuery]);

  const rows = paginate(filteredUsers, page, PAGE_SIZE);
  const selected = users.find((u) => u.employeeId === selectedId);

  const exportCsv = () =>
    downloadCsv(
      "users.csv",
      [
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
      ],
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
          roleLabel(u.role),
          statusLabel(u.status),
          u.lastLoginAt ?? "",
        ];
      }),
    );

  return (
    <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <section aria-labelledby="user-list-title" className="flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[20px]">
        <div className="flex flex-col gap-[12px] sm:flex-row sm:items-center sm:justify-between">
          <h2 id="user-list-title" className="text-[17px] font-semibold text-ink">
            รายชื่อผู้ใช้งานระบบ
          </h2>
          <Button onClick={exportCsv} disabled={filteredUsers.length === 0} className="sm:w-[200px] disabled:opacity-50">
            <FileDown className="size-4" aria-hidden="true" />
            ส่งออก CSV
          </Button>
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
            { id: "all", label: "ทั้งหมด", count: users.length },
            { id: "ACTIVE", label: "ใช้งานอยู่", count: users.filter((u) => u.status === "ACTIVE").length },
            { id: "RESIGNED", label: "ลาออก", count: users.filter((u) => u.status === "RESIGNED").length },
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
                  <td colSpan={7}className={cx(table.td, "py-[40px] text-center text-muted")}>
                    {users.length === 0 ? "ยังไม่มีข้อมูลผู้ใช้งาน" : "ไม่พบผู้ใช้ที่ตรงกับเงื่อนไข"}
                  </td>
                </tr>
              ) : (
                rows.map((u) => {
                  const isSelected = u.employeeId === selectedId;
                  return (
                    <tr
                      key={u.employeeId}
                      onClick={() => setSelectedId(u.employeeId)}
                      aria-selected={isSelected}
                      className={cx(table.row, "cursor-pointer", isSelected ? table.rowSelected : table.rowHover)}
                    >
                      <td className={cx(table.td, "font-semibold whitespace-nowrap")}>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedId(u.employeeId);
                          }}
                          className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                        >
                          {u.employeeId}
                        </button>
                      </td>
                      <td className={table.td}>
                        {u.name}
                        {u.profile.nickname ? <span className="block text-[12px] text-muted">({u.profile.nickname})</span> : null}
                      </td>
                      <td className={table.td}>
                        {u.profile.departmentName ?? <span className="text-muted">—</span>}
                        {u.profile.positionName ? <span className="block text-[12px] text-muted">{u.profile.positionName}</span> : null}
                      </td>
                      <td className={cx(table.td, "break-all text-muted")}>{u.email}</td>
                      <td className={table.td}>
                        <Tag tone={u.role === "SUPER_ADMIN" ? "info" : "outline"} className="rounded-full">
                          {roleLabel(u.role)}
                        </Tag>
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

        <div className="mt-auto pt-[8px]">
          <Pagination page={page} pageSize={PAGE_SIZE} total={filteredUsers.length} onChange={setPage} />
        </div>
      </section>

      {selected ? (
        <UserPanel
          key={selected.employeeId}
          user={selected}
          orgOptions={orgOptions}
          managerChoices={users
            .filter((u) => u.status === "ACTIVE" && u.employeeId !== selected.employeeId)
            .map((u) => ({ value: u.employeeId, label: `${u.name} (${u.employeeId})` }))}
          onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.employeeId === updated.employeeId ? updated : u)))}
        />
      ) : (
        <p className="rounded-[10px] border border-dashed border-line bg-white p-[20px] text-center text-[14px] text-muted xl:self-start">
          เลือกผู้ใช้จากตารางเพื่อดูและแก้ไขข้อมูล
        </p>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] font-normal text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

type InfoRow = [label: string, value: ReactNode];

function InfoRows({ rows }: { rows: InfoRow[] }) {
  return (
    <dl className="flex flex-col gap-[8px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-3 text-[13px]">
          <dt className="shrink-0 text-muted">{label}</dt>
          <dd className={cx("min-w-0 break-words text-right", value ? "font-medium text-ink" : "text-muted")}>{value || "—"}</dd>
        </div>
      ))}
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

type SectionId = "account" | "personal" | "contact" | "work";

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
              <span className="text-[13px] font-medium text-ink" aria-hidden="true">
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
            <label key={f.key} className={cx("flex min-w-0 flex-col gap-[6px] text-[13px] font-medium text-ink", f.wide && "col-span-2")}>
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

      <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink">
        <span>
          เหตุผลการเปลี่ยนแปลง <span className="text-danger">*</span>
        </span>
        <textarea
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ระบุเหตุผล เช่น ย้ายแผนก, แก้ไขเบอร์โทร"
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-normal text-ink placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      {error ? (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-[8px]">
        <Button onClick={onCancel} disabled={saving}>
          ยกเลิก
        </Button>
        <Button type="submit" variant="primary" disabled={saving || !dirty} className="disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}

const EMPTY_CHOICE: Choice = { value: "", label: "— ไม่ระบุ —" };

/** ตัวเลือก dropdown + ค่าปัจจุบัน (กรณีถูกปิดใช้งานแล้ว) เพื่อไม่ให้ค่าเดิมหายไปเงียบ ๆ */
function toChoices(options: OrgOption[], currentId: string | null, currentName: string | null): Choice[] {
  const choices = options.map((o) => ({ value: o.id, label: o.name }));
  if (currentId && !options.some((o) => o.id === currentId)) {
    choices.unshift({ value: currentId, label: `${currentName ?? currentId} (ปิดใช้งาน)` });
  }
  return [EMPTY_CHOICE, ...choices];
}

/** ข้อมูลผู้ใช้ในการ์ดเดียว แต่ละส่วนแก้ไขแยกกัน (แก้ได้ทีละส่วน) */
function UserPanel({
  user,
  orgOptions,
  managerChoices,
  onSaved,
}: {
  user: User;
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
  const workLine = [p.positionName, p.departmentName].filter(Boolean).join(" · ");
  const managerLabel = p.managerName ? `${p.managerName}${p.managerCode ? ` (${p.managerCode})` : ""}` : null;
  const emergencyLabel = joinParts(p.emergencyContactName, p.emergencyContactPhone && `· ${p.emergencyContactPhone}`);
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
      rows: [
        ["ชื่อล็อกอิน", <span key="email" className="break-all">{user.email}</span>],
        [
          "บทบาท",
          <Tag key="role" tone={user.role === "SUPER_ADMIN" ? "info" : "outline"} className="rounded-full">
            {roleLabel(user.role)}
          </Tag>,
        ],
        ["สถานะ", statusLabel(user.status)],
        ["ใช้งานล่าสุด", user.lastLoginAt ? formatShortThaiDate(user.lastLoginAt) : null],
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
      ],
      fields: [
        { key: "titleTh", label: "คำนำหน้า", list: "title-th-options", placeholder: "นาย / นาง / นางสาว" },
        { key: "nickname", label: "ชื่อเล่น" },
        { key: "firstNameTh", label: "ชื่อ (ไทย)", required: true },
        { key: "lastNameTh", label: "นามสกุล (ไทย)", required: true },
        { key: "firstNameEn", label: "ชื่อ (อังกฤษ)" },
        { key: "lastNameEn", label: "นามสกุล (อังกฤษ)" },
      ],
      initial: {
        titleTh: p.titleTh ?? "",
        nickname: p.nickname ?? "",
        firstNameTh: p.firstNameTh ?? "",
        lastNameTh: p.lastNameTh ?? "",
        firstNameEn: p.firstNameEn ?? "",
        lastNameEn: p.lastNameEn ?? "",
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

  return (
    <aside
      aria-labelledby="user-panel-title"
      className="flex min-w-0 flex-col gap-[14px] rounded-[10px] border border-line bg-white p-[20px] xl:sticky xl:top-[24px] xl:max-h-[calc(100vh-48px)] xl:self-start xl:overflow-y-auto"
    >
      <header className="flex items-start gap-[12px]">
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[18px] font-semibold text-primary-700"
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 id="user-panel-title" className="min-w-0 break-words text-[17px] font-semibold text-ink">
              {user.name}
            </h2>
            <Tag tone={user.status === "ACTIVE" ? "success" : "neutral"} className="shrink-0">
              {statusLabel(user.status)}
            </Tag>
          </div>
          <p className="mt-[2px] text-[12px] text-muted tabular-nums">
            {user.employeeId}
            {p.nickname ? ` · ${p.nickname}` : ""}
          </p>
          {workLine ? <p className="text-[12px] text-muted">{workLine}</p> : null}
        </div>
      </header>

      {notice && !editing ? (
        <p role="status" className="rounded-lg bg-surface px-3 py-2 text-[12px] text-ok">
          {notice}
        </p>
      ) : null}

      <datalist id="title-th-options">
        <option value="นาย" />
        <option value="นาง" />
        <option value="นางสาว" />
      </datalist>

      {sections.map((s) => {
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
              <h3 className="text-[13px] font-semibold text-ink">{s.title}</h3>
              {isEditing ? (
                <span className="text-[12px] text-primary-700">กำลังแก้ไข</span>
              ) : (
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
      })}
    </aside>
  );
}
