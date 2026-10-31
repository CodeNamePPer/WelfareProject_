"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { FileDown } from "lucide-react";
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
import { formatShortThaiDate } from "@/lib/format";

type User = {
  employeeId: string; // Primary Key
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  updatedAt?: string;
};

type Filter = "all" | "ACTIVE" | "RESIGNED";

const PAGE_SIZE = 7;

const STATUS_LABELS: Record<string, string> = { ACTIVE: "ทำงานอยู่", RESIGNED: "ลาออก" };

const roleLabel = (role: string) => ROLE_LABELS[role as Role] ?? role;
const statusLabel = (status: string) => STATUS_LABELS[status] ?? status;

// Layout follows Figma "Admin / ผู้ใช้งาน" (node 163:643): user list + account detail card.
export default function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedId, setSelectedId] = useState<string | null>(initialUsers[0]?.employeeId ?? null);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // กรองตามสถานะ + รหัสพนักงาน ชื่อ หรืออีเมล
  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && u.status !== filter) return false;
      return (
        !query ||
        u.employeeId.toLowerCase().includes(query) ||
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    });
  }, [users, filter, searchQuery]);

  const rows = paginate(filteredUsers, page, PAGE_SIZE);
  const selected = users.find((u) => u.employeeId === selectedId);

  const exportCsv = () =>
    downloadCsv(
      "users.csv",
      ["รหัสพนักงาน", "ชื่อ", "อีเมล", "บทบาท", "สถานะ", "ใช้งานล่าสุด"],
      filteredUsers.map((u) => [u.employeeId, u.name, u.email, roleLabel(u.role), statusLabel(u.status), u.lastLoginAt ?? ""]),
    );

  return (
    <div className="grid grid-cols-1 gap-[22px] xl:grid-cols-[minmax(0,1fr)_355px]">
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
          placeholder="ค้นหาชื่อ / รหัส / อีเมล"
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
                <th scope="col" className={table.th}>Email</th>
                <th scope="col" className={table.th}>บทบาท</th>
                <th scope="col" className={table.th}>สถานะ</th>
                <th scope="col" className={table.th}>ใช้งานล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={cx(table.td, "py-[40px] text-center text-muted")}>
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
                      <td className={table.td}>{u.name}</td>
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
        <UserDetail
          key={`${selected.employeeId}-${selected.updatedAt ?? ""}`}
          user={selected}
          onSaved={(updated) => setUsers((prev) => prev.map((u) => (u.employeeId === updated.employeeId ? updated : u)))}
        />
      ) : (
        <p className="rounded-[10px] border border-dashed border-line bg-white p-[20px] text-center text-[14px] text-muted">
          เลือกผู้ใช้จากตารางเพื่อดูและแก้ไขบัญชี
        </p>
      )}
    </div>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

function UserDetail({ user, onSaved }: { user: User; onSaved: (user: User) => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, status: user.status });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const dirty = form.name !== user.name || form.email !== user.email || form.role !== user.role || form.status !== user.status;

  const reset = () => {
    setForm({ name: user.name, email: user.email, role: user.role, status: user.status });
    setReason("");
    setMessage(null);
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setMessage({ tone: "error", text: "กรุณาระบุเหตุผลการเปลี่ยนแปลง" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId: user.employeeId, ...form, reason: reason.trim() }),
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        setMessage({ tone: "error", text: result.error || "บันทึกไม่สำเร็จ" });
        return;
      }
      const result = await res.json().catch(() => ({}));
      onSaved({ ...user, ...form, updatedAt: result.updatedAt || new Date().toISOString() });
    } catch {
      setMessage({ tone: "error", text: "เกิดข้อผิดพลาดในการบันทึก" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      aria-labelledby="user-detail-title"
      className="flex flex-col gap-[14px] rounded-[10px] border border-line bg-white p-[20px] xl:sticky xl:top-[24px] xl:self-start"
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="user-detail-title" className="text-[17px] font-semibold text-ink">
            บัญชีผู้ใช้ : {user.name}
          </h2>
          <p className="mt-[4px] text-[12px] text-muted">
            {user.employeeId}
            {user.lastLoginAt ? ` · ใช้งานล่าสุด ${formatShortThaiDate(user.lastLoginAt)}` : ""}
          </p>
          <p className="text-[12px] text-muted">บทบาท: {roleLabel(user.role)}</p>
        </div>
        <Tag tone={user.status === "ACTIVE" ? "success" : "neutral"}>{user.status === "ACTIVE" ? "ใช้งานอยู่" : statusLabel(user.status)}</Tag>
      </header>

      <p className="text-[13px] font-semibold text-ink">ข้อมูลผู้ใช้</p>

      <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink">
        ชื่อ-นามสกุล
        <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </label>

      <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink">
        อีเมล
        <input type="email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      </label>

      <div className="flex flex-col gap-[6px]">
        <span className="text-[13px] font-medium text-ink" aria-hidden="true">บทบาท</span>
        <Select label="บทบาท" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-[6px]">
        <span className="text-[13px] font-medium text-ink" aria-hidden="true">สถานะ</span>
        <Select label="สถานะ" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ACTIVE">ทำงานอยู่ (ACTIVE)</option>
          <option value="RESIGNED">ลาออก (RESIGNED)</option>
        </Select>
      </div>

      <label className="flex flex-col gap-[6px] text-[13px] font-medium text-ink">
        <span>
          เหตุผลการเปลี่ยนแปลง <span className="text-danger">*</span>
        </span>
        <textarea
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ระบุเหตุผล เช่น ย้ายแผนก, ลาออก"
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-normal text-ink placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </label>

      {message ? (
        <p role={message.tone === "error" ? "alert" : "status"} className={cx("text-[12px]", message.tone === "error" ? "text-danger" : "text-ok")}>
          {message.text}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-[8px]">
        <Button onClick={reset} disabled={saving || (!dirty && !reason)} className="disabled:opacity-50">
          ยกเลิก
        </Button>
        <Button type="submit" variant="primary" disabled={saving || !dirty} className="disabled:cursor-not-allowed disabled:opacity-50">
          {saving ? "กำลังบันทึก…" : "บันทึก"}
        </Button>
      </div>
    </form>
  );
}
