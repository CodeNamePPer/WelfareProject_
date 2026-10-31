'use client';

import { useState, useMemo } from 'react';
import { Search, X, Pencil, Check, Ban } from 'lucide-react';
import type { SystemUser, UserRole, UserStatus } from '../../types';
import { cx } from '../../lib/cx';

const ROLES: UserRole[] = ['EMPLOYEE', 'HR', 'FINANCE', 'SUPER_ADMIN'];

const ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: 'พนักงาน',
  HR: 'ฝ่ายบุคคล (HR)',
  FINANCE: 'ฝ่ายการเงิน',
  SUPER_ADMIN: 'Super Admin',
};

const ROLE_COLORS: Record<UserRole, string> = {
  EMPLOYEE: 'bg-primary-100 text-primary-700',
  HR: 'bg-status-approved-soft text-status-approved-ink',
  FINANCE: 'bg-status-pending-soft text-status-pending-ink',
  SUPER_ADMIN: 'bg-status-rejected-soft text-status-rejected-ink',
};

function formatThaiDateTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

interface UsersPageClientProps {
  initialUsers: SystemUser[];
}

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const [users, setUsers] = useState<SystemUser[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<SystemUser>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  /* ── Filter ── */
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.employeeId.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q),
    );
  }, [users, searchQuery]);

  /* ── Edit handlers ── */
  const handleEdit = (user: SystemUser) => {
    setEditingId(user.employeeId);
    setEditForm({ ...user });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      // TODO: replace with real API call
      // const res = await fetch('/api/admin/users', { method: 'PUT', ... });
      await new Promise((r) => setTimeout(r, 400)); // simulate network
      setUsers((prev) =>
        prev.map((u) =>
          u.employeeId === editingId
            ? ({ ...u, ...editForm, updatedAt: new Date().toISOString() } as SystemUser)
            : u,
        ),
      );
      setEditingId(null);
    } catch {
      alert('เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((u) => u.status === 'ACTIVE').length;
  const resignedCount = users.filter((u) => u.status === 'RESIGNED').length;

  return (
    <div className="flex flex-col gap-6">
      {/* Summary row */}
      <div className="flex flex-wrap gap-3">
        <StatPill label="ผู้ใช้งานทั้งหมด" value={users.length} />
        <StatPill label="ใช้งานอยู่" value={activeCount} color="ok" />
        <StatPill label="ลาออก" value={resignedCount} color="danger" />
      </div>

      {/* Search + count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-80">
          <Search
            className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา รหัสพนักงาน / ชื่อ / อีเมล"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-9 text-sm text-ink placeholder:text-muted focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-3 my-auto flex items-center text-muted hover:text-ink"
              aria-label="ล้างคำค้นหา"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <p className="text-[13px] text-muted">
          แสดง {filteredUsers.length} จากทั้งหมด {users.length} รายการ
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line shadow-[var(--shadow-card)]">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs font-semibold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">รหัสพนักงาน</th>
              <th className="px-4 py-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 whitespace-nowrap">อีเมล</th>
              <th className="px-4 py-3 whitespace-nowrap">บทบาท</th>
              <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
              <th className="px-4 py-3 whitespace-nowrap">แก้ไขล่าสุด</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted">
                  ไม่พบข้อมูลที่ตรงกับ &ldquo;{searchQuery}&rdquo;
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isEditing = editingId === u.employeeId;
                return (
                  <tr
                    key={u.employeeId}
                    className={cx(
                      'transition-colors',
                      isEditing ? 'bg-primary-50' : 'hover:bg-surface',
                    )}
                  >
                    {/* รหัสพนักงาน */}
                    <td className="px-4 py-3 font-mono font-semibold text-ink whitespace-nowrap">
                      {u.employeeId}
                    </td>

                    {/* ชื่อ */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full rounded border border-line bg-white px-2 py-1 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={editForm.name ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        <span className="font-medium text-ink">{u.name}</span>
                      )}
                    </td>

                    {/* อีเมล */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="email"
                          className="w-full rounded border border-line bg-white px-2 py-1 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={editForm.email ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      ) : (
                        <span className="text-muted">{u.email}</span>
                      )}
                    </td>

                    {/* บทบาท */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          className="rounded border border-line bg-white px-2 py-1 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={editForm.role ?? u.role}
                          onChange={(e) =>
                            setEditForm({ ...editForm, role: e.target.value as UserRole })
                          }
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cx(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                            ROLE_COLORS[u.role],
                          )}
                        >
                          {ROLE_LABELS[u.role]}
                        </span>
                      )}
                    </td>

                    {/* สถานะ */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isEditing ? (
                        <select
                          className="rounded border border-line bg-white px-2 py-1 text-sm text-ink focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={editForm.status ?? u.status}
                          onChange={(e) =>
                            setEditForm({ ...editForm, status: e.target.value as UserStatus })
                          }
                        >
                          <option value="ACTIVE">ACTIVE (ใช้งาน)</option>
                          <option value="RESIGNED">RESIGNED (ลาออก)</option>
                        </select>
                      ) : (
                        <StatusBadge status={u.status} />
                      )}
                    </td>

                    {/* แก้ไขล่าสุด */}
                    <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                      {formatThaiDateTime(u.updatedAt)}
                    </td>

                    {/* จัดการ */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                          >
                            <Check className="size-3.5" aria-hidden="true" />
                            {saving ? 'กำลังบันทึก…' : 'บันทึก'}
                          </button>
                          <button
                            onClick={handleCancel}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface transition-colors"
                          >
                            <Ban className="size-3.5" aria-hidden="true" />
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(u)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink hover:bg-primary-50 hover:border-primary-200 transition-colors"
                        >
                          <Pencil className="size-3.5" aria-hidden="true" />
                          แก้ไข
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: 'ok' | 'danger';
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm',
        color === 'ok'
          ? 'border-status-approved/30 bg-status-approved-soft text-status-approved-ink'
          : color === 'danger'
            ? 'border-status-rejected/30 bg-status-rejected-soft text-status-rejected-ink'
            : 'border-line bg-white text-ink',
      )}
    >
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-xs">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'ACTIVE'
          ? 'bg-status-approved-soft text-status-approved-ink'
          : 'bg-status-rejected-soft text-status-rejected-ink',
      )}
    >
      <span
        className={cx(
          'size-1.5 rounded-full',
          status === 'ACTIVE' ? 'bg-status-approved' : 'bg-status-rejected',
        )}
        aria-hidden="true"
      />
      {status === 'ACTIVE' ? 'ใช้งาน' : 'ลาออก'}
    </span>
  );
}
