"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { CircleCheck, Copy, FileDown, KeyRound, Pencil, TriangleAlert } from "lucide-react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { Button as AdminButton } from "@/components/ui/Button";
import { ExportCsvDialog } from "@/components/ui/ExportCsvDialog";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FilterPill,
  PageHeader,
  RequesterCompact,
  RequesterFull,
  Tabs,
  fieldClass,
} from "@/features/hr/ui";
import { downloadCsv } from "@/lib/csv";
import { cx } from "@/lib/cx";
import { formatShortThaiDate, formatThaiDate } from "@/lib/format";
import { useDetailParam } from "@/lib/useDetailParam";
import type { EmployeeProfile, OrgOption, OrgOptions } from "@/lib/auth/users";
import { deliverableEmail, type EmailDelivery, type ResetFallback } from "@/lib/email/address";
import { employmentStatusLabel } from "@/lib/employmentStatus";

export type User = {
  employeeId: string; // Primary Key
  email: string; // ชื่อล็อกอิน
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  updatedAt?: string;
  hasAccount: boolean;
  lockedUntil?: string | null;
  failedAttempts?: number;
  profile: EmployeeProfile;
};

type Tab = "active" | "left" | "all";

// คอลัมน์เดียวกับ HR (/hr/employees — ดีไซน์ H05)
const COLS = "grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1.2fr)_130px_110px]";

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
  if (!user.hasAccount) return <Badge tone="neutral">{NO_ACCOUNT}</Badge>;
  return <Badge tone={user.role === "SUPER_ADMIN" ? "review" : "neutral"}>{roleLabel(user.role)}</Badge>;
}

/** อายุงาน เช่น "8 ปี 7 เดือน" นับถึงวันนี้หรือวันที่พ้นสภาพ (ชุดเดียวกับ HR /hr/employees/[id]) */
function tenureOf(hireIso: string | null, endIso: string | null) {
  if (!hireIso) return "—";
  const start = new Date(`${hireIso}T00:00:00+07:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00+07:00`) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "ไม่ถึง 1 เดือน";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : ""].filter(Boolean).join(" ");
}

const joinParts = (...parts: (string | null)[]) => parts.filter(Boolean).join(" ") || null;
const addressLabel = (p: EmployeeProfile) =>
  [p.addressLine, p.subdistrict, p.district, p.province, p.postalCode].filter(Boolean).join(" ") || null;
const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "th"));

// หน้าตั้งค่าผู้ใช้งานระบบ ปรับใช้ดีไซน์เดียวกับ HR (/hr/employees — H05 และ H09)
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
  const [tab, setTab] = useState<Tab>("active");
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [level, setLevel] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [exporting, setExporting] = useState(false);

  const listedUsers = useMemo(() => users.filter((u) => u.status !== "DECEASED"), [users]);
  const activeCount = useMemo(() => listedUsers.filter((u) => u.status === "ACTIVE").length, [listedUsers]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listedUsers.filter((u) => {
      const isActive = u.status === "ACTIVE";
      if (tab === "active" && !isActive) return false;
      if (tab === "left" && isActive) return false;
      const p = u.profile;
      const deptName = p.departmentName ?? "ยังไม่ระบุแผนก";
      const posName = p.positionName ?? "ยังไม่ระบุตำแหน่ง";
      const lvlName = p.jobLevelName ?? "—";
      const rLabel = u.hasAccount ? roleLabel(u.role) : NO_ACCOUNT;
      if (department && deptName !== department) return false;
      if (position && posName !== position) return false;
      if (level && lvlName !== level) return false;
      if (roleFilter && rLabel !== roleFilter) return false;
      if (!q) return true;
      return [u.employeeId, u.name, u.email, p.nickname, p.contactEmail, p.departmentName, p.positionName].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [listedUsers, tab, query, department, position, level, roleFilter]);

  const selected = users.find((u) => u.employeeId === detail.id);

  const exportCsv = () =>
    downloadCsv(
      "users.csv",
      CSV_COLUMNS,
      shown.map((u) => {
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
        <div className="flex flex-col gap-4">
          <PageHeader
            crumbs={[{ label: "จัดการพนักงานและผู้ใช้งาน", href: "/admin/users" }, { label: selected.employeeId }]}
            title={selected.name}
            description={[selected.employeeId, selected.profile.positionName, selected.profile.departmentName].filter(Boolean).join(" · ")}
            actions={
              <Button variant="quiet" onClick={() => detail.close()}>
                กลับหน้ารายชื่อ
              </Button>
            }
          />
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

      <div className={cx("flex flex-col gap-4", selected && "hidden")}>
        <PageHeader
          title="จัดการพนักงานและผู้ใช้งานระบบ"
          description={`${listedUsers.length} คน · ทำงานอยู่ ${activeCount} · พ้นสภาพ ${listedUsers.length - activeCount}`}
          actions={
            <Button variant="secondary" onClick={() => setExporting(true)} disabled={shown.length === 0}>
              <FileDown className="size-4" aria-hidden="true" />
              ส่งออก CSV
            </Button>
          }
        />

        <ExportCsvDialog
          open={exporting}
          rowCount={shown.length}
          unit="คน"
          columns={CSV_COLUMNS}
          personalData="ชื่อ อีเมล เบอร์โทร และข้อมูลการจ้างงาน"
          onCancel={() => setExporting(false)}
          onConfirm={() => {
            exportCsv();
            setExporting(false);
          }}
        />

        <Card>
          <Tabs
            label="กลุ่มพนักงาน"
            value={tab}
            onChange={setTab}
            items={[
              { id: "active", label: "ทำงานอยู่", count: activeCount },
              { id: "left", label: "พ้นสภาพ", count: listedUsers.length - activeCount },
              { id: "all", label: "ทั้งหมด", count: listedUsers.length },
            ]}
          />

          <div className="flex flex-wrap gap-2 px-5 py-3">
            <input
              type="search"
              aria-label="ค้นหาพนักงาน"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อ รหัส อีเมล"
              className={cx(fieldClass, "!h-9 w-full sm:!w-[260px]")}
            />
            <FilterPill label="แผนก" value={department} onChange={setDepartment}>
              {unique(listedUsers.map((u) => u.profile.departmentName ?? "ยังไม่ระบุแผนก")).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </FilterPill>
            <FilterPill label="ตำแหน่ง" value={position} onChange={setPosition}>
              {unique(listedUsers.map((u) => u.profile.positionName ?? "ยังไม่ระบุตำแหน่ง")).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </FilterPill>
            <FilterPill label="ระดับ" value={level} onChange={setLevel}>
              {unique(listedUsers.map((u) => u.profile.jobLevelName ?? "—")).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </FilterPill>
            <FilterPill label="บทบาท" value={roleFilter} onChange={setRoleFilter}>
              {unique(listedUsers.map((u) => (u.hasAccount ? roleLabel(u.role) : NO_ACCOUNT))).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </FilterPill>
          </div>

          {shown.length === 0 ? (
            <EmptyState>
              {query || department || position || level || roleFilter
                ? "ไม่พบพนักงานที่ตรงกับตัวกรอง"
                : tab === "active"
                  ? "ยังไม่มีพนักงานที่ทำงานอยู่"
                  : "ยังไม่มีพนักงานที่พ้นสภาพ"}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <div className={cx("grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted", COLS)}>
                  <span>พนักงาน</span>
                  <span>ระดับ / หัวหน้า</span>
                  <span>บทบาท / ชื่อล็อกอิน</span>
                  <span>สถานะ</span>
                  <span />
                </div>
                {shown.map((u) => {
                  const p = u.profile;
                  const active = u.status === "ACTIVE";
                  const locked = Boolean(u.lockedUntil && new Date(u.lockedUntil).getTime() > Date.now());
                  return (
                    <button
                      key={u.employeeId}
                      type="button"
                      onClick={() => detail.open(u.employeeId)}
                      className={cx(
                        "grid w-full items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3 text-left text-ink transition-colors hover:bg-surface motion-reduce:transition-none",
                        COLS,
                      )}
                    >
                      <RequesterCompact
                        person={{
                          name: u.name,
                          code: u.employeeId,
                          position: p.positionName,
                          department: p.departmentName,
                        }}
                      />
                      <span className="text-13">
                        {p.jobLevelName ?? "—"}
                        <span className="block text-muted">หัวหน้า: {p.managerName ?? "—"}</span>
                      </span>
                      <span className="min-w-0 text-13">
                        <RoleTag user={u} />
                        <span className="mt-0.5 block truncate text-12 text-muted">{u.email || p.contactEmail || "—"}</span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={active ? "approved" : "neutral"}>{statusLabel(u.status)}</Badge>
                        {locked ? <Badge tone="rejected">ถูกล็อก</Badge> : null}
                      </span>
                      <span className="text-13 text-[#1D4ED8]">ดู / แก้ไข ›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-13 font-normal text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

type InfoRow = [label: string, value: ReactNode];

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

export type Choice = { value: string; label: string; disabled?: boolean };

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

export type SectionId = "account" | "personal" | "family" | "contact" | "work";

/** ฟอร์มแก้ไขของแต่ละส่วน */
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

      <div className="flex justify-end gap-2">
        <Button variant="quiet" onClick={onCancel} disabled={saving}>
          ยกเลิก
        </Button>
        <Button type="submit" disabled={!dirty || saving}>
          {saving ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}
        </Button>
      </div>
    </form>
  );
}

const EMPTY_CHOICE: Choice = { value: "", label: "— ไม่ระบุ —" };
const GENDER_OPTIONS = ["ชาย", "หญิง", "ไม่ระบุ"];
const MARITAL_OPTIONS = ["โสด", "สมรส", "หย่าร้าง / หม้าย"];
const withEmpty = (options: string[]): Choice[] => [EMPTY_CHOICE, ...options.map((value) => ({ value, label: value }))];

function toChoices(options: OrgOption[], currentId: string | null, currentName: string | null): Choice[] {
  const choices = options.map((o) => ({ value: o.id, label: o.name }));
  if (currentId && !options.some((o) => o.id === currentId)) {
    choices.unshift({ value: currentId, label: `${currentName ?? currentId} (ปิดใช้งาน)` });
  }
  return [EMPTY_CHOICE, ...choices];
}

/** หน้ารายละเอียดและแก้ไขข้อมูลพนักงาน (ใช้ดีไซน์ H09 มีการ์ด RequesterFull ด้านซ้าย เหมือนกันทั้ง Admin และ HR) */
export function UserPanel({
  user,
  isSelf = false,
  emailDelivery,
  orgOptions,
  managerChoices,
  mode = "admin",
  defaultEditing = null,
  onSaved,
}: {
  user: User;
  isSelf?: boolean;
  emailDelivery?: EmailDelivery;
  orgOptions: OrgOptions;
  managerChoices: Choice[];
  mode?: "admin" | "hr";
  defaultEditing?: SectionId | null;
  onSaved: (user: User) => void;
}) {
  const [editing, setEditing] = useState<SectionId | null>(defaultEditing);
  const [notice, setNotice] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  const isLocked = Boolean(user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now());

  const handleUnlock = async () => {
    if (unlocking) return;
    setUnlocking(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: user.employeeId,
          section: "unlock",
          reason: "ผู้ดูแลระบบปลดล็อกบัญชีที่ถูกล็อกชั่วคราว",
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.user) {
        onSaved(result.user);
        setNotice("ปลดล็อกบัญชีผู้ใช้งานเรียบร้อยแล้ว");
      }
    } finally {
      setUnlocking(false);
    }
  };

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
      title: "บัญชีเข้าใช้งานระบบ",
      rows: user.hasAccount
        ? [
            ["ชื่อล็อกอิน", <span key="email" className="break-all">{user.email}</span>],
            ["บทบาท", <RoleTag key="role" user={user} />],
            ["สถานะการทำงาน", statusLabel(user.status)],
            [
              "สถานะการล็อกบัญชี",
              isLocked ? (
                <span key="lock" className="inline-flex flex-wrap items-center justify-end gap-2">
                  <Badge tone="rejected">ถูกล็อกชั่วคราว</Badge>
                  <Button size="sm" disabled={unlocking} onClick={() => void handleUnlock()}>
                    {unlocking ? "กำลังปลดล็อก..." : "ปลดล็อกบัญชี"}
                  </Button>
                </span>
              ) : (
                "ปกติ"
              ),
            ],
            ["ใช้งานล่าสุด", user.lastLoginAt ? formatShortThaiDate(user.lastLoginAt) : null],
          ]
        : [
            ["บัญชีเข้าใช้งาน", <RoleTag key="role" user={user} />],
            ["สถานะการทำงาน", statusLabel(user.status)],
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
      title: "ครอบครัว (ใช้คำนวณสิทธิ์สวัสดิการ)",
      rows: [
        ["สถานะสมรส", p.maritalStatus],
        ["จำนวนบุตร (สูงสุด 2 คน)", p.childrenCount === null ? null : `${p.childrenCount} คน`],
      ],
      fields: [
        { key: "maritalStatus", label: "สถานะสมรส", type: "select", options: withEmpty(MARITAL_OPTIONS) },
        {
          key: "childrenCount",
          label: "จำนวนบุตร (สูงสุด 2 คน)",
          type: "select",
          options: [
            EMPTY_CHOICE,
            { value: "0", label: "0 คน (ไม่มีบุตร)" },
            { value: "1", label: "1 คน" },
            { value: "2", label: "2 คน" },
          ],
        },
      ],
      initial: {
        maritalStatus: p.maritalStatus ?? "",
        childrenCount: p.childrenCount === null ? "" : String(Math.min(2, Math.max(0, p.childrenCount))),
      },
    },
    {
      id: "contact",
      title: "ข้อมูลติดต่อ",
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
      title: "ข้อมูลการทำงาน",
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

  const renderSectionCard = (s: (typeof sections)[number]) => {
    const isEditing = editing === s.id;
    return (
      <Card
        key={s.id}
        aria-label={s.title}
        className={cx("flex flex-col gap-3 p-5", editing && !isEditing && "opacity-60")}
      >
        <div className="flex min-h-8 items-center justify-between gap-3">
          <h2 className="text-15 font-semibold text-ink">{s.title}</h2>
          {isEditing ? (
            <Badge tone="review">กำลังแก้ไข</Badge>
          ) : s.id === "account" && !user.hasAccount ? null : (
            <Button
              size="sm"
              variant="quiet"
              onClick={() => {
                setNotice(null);
                setEditing(s.id);
              }}
              disabled={editing !== null}
              aria-label={`แก้ไข${s.title}`}
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
      </Card>
    );
  };

  const visibleSections = mode === "hr" ? sections.slice(1) : sections;

  return (
    <div className="flex flex-wrap items-start gap-4">
      <datalist id="title-th-options">
        <option value="นาย" />
        <option value="นาง" />
        <option value="นางสาว" />
      </datalist>

      {/* คอลัมน์ซ้าย: การ์ดโปรไฟล์พนักงานแบบเดียวกับ HR (/hr/employees/[id]) */}
      <div className="min-w-0 flex-[1_1_280px]">
        <RequesterFull
          title="พนักงาน"
          person={{
            name: user.name,
            code: user.employeeId,
            position: p.positionName,
            department: p.departmentName,
            level: p.jobLevelName,
            tenure: tenureOf(p.hireDate, user.status === "ACTIVE" ? null : endDate),
            supervisor: p.managerName,
            employmentStatus: statusLabel(user.status),
            claimsThisYear: user.hasAccount ? roleLabel(user.role) : NO_ACCOUNT,
            available: user.lastLoginAt ? formatShortThaiDate(user.lastLoginAt) : "ยังไม่เคยเข้าใช้",
          }}
        />
      </div>

      {/* คอลัมน์ขวา: การ์ดข้อมูลและการแก้ไขแต่ละหมวด */}
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
        {notice && !editing ? (
          <p role="status" className="rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-2.5 text-13 font-medium text-[#166534]">
            {notice}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visibleSections.map(renderSectionCard)}
          {mode === "admin" && emailDelivery ? (
            <ResetPasswordSection
              user={user}
              isSelf={isSelf}
              emailDelivery={emailDelivery}
              dimmed={editing !== null}
              onIssued={onSaved}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

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
    <Card
      aria-label="รหัสผ่าน"
      className={cx("flex flex-col gap-3 p-5", dimmed && "opacity-60")}
    >
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="text-15 font-semibold text-ink">จัดการรหัสผ่านและบัญชี</h2>
        <Button
          size="sm"
          variant={issuing ? "primary" : "reject"}
          onClick={() => setOpen(true)}
          disabled={dimmed || blocked !== null}
          aria-describedby={hintId}
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
            triggerRef.current?.focus();
          }}
        />
      ) : null}
    </Card>
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
  const mustAcknowledge = tempPassword !== null && !copied && !acknowledged;
  const canDismiss = !saving && !mustAcknowledge;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    reasonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (done) resultRef.current?.focus();
  }, [done]);

  const dismiss = () => {
    ref.current?.close();
    onClose();
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
      setError(
        issuing
          ? "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาโหลดหน้าใหม่เพื่อตรวจว่าออกบัญชีแล้วหรือยัง"
          : "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ รหัสผ่านยังไม่ถูกรีเซ็ต ลองอีกครั้ง",
      );
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
              <AdminButton onClick={requestClose} disabled={saving}>
                ยกเลิก
              </AdminButton>
              <AdminButton type="submit" variant={issuing ? "primary" : "danger"} loading={saving}>
                {issuing ? (saving ? "กำลังออกบัญชี…" : "ออกบัญชี") : saving ? "กำลังรีเซ็ต…" : "รีเซ็ตรหัสผ่าน"}
              </AdminButton>
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
              <AdminButton ref={resultRef} variant="primary" onClick={dismiss}>
                เสร็จสิ้น
              </AdminButton>
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
              <AdminButton ref={resultRef} size="sm" onClick={copy} aria-label="คัดลอกรหัสผ่านชั่วคราว">
                <Copy className="size-3.5" aria-hidden="true" />
                {copied ? "คัดลอกแล้ว" : "คัดลอก"}
              </AdminButton>
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
              <AdminButton
                variant="primary"
                onClick={dismiss}
                disabled={mustAcknowledge}
                aria-describedby={mustAcknowledge ? ackId : undefined}
                className="disabled:cursor-not-allowed disabled:opacity-50"
              >
                เสร็จสิ้น
              </AdminButton>
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
