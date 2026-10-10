"use client";

import { useState } from "react";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/auth/roles";

type User = {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  role: string;
  status: string;
  lastLoginAt?: string;
  updatedAt?: string;
};

function formatThaiDateTime(iso?: string) {
  if (!iso) return "-";
  try {
    const date = new Date(iso);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminUsersClient({ initialUsers }: { initialUsers: User[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });
      if (res.ok) {
        const result = await res.json().catch(() => ({}));
        const newUpdatedAt = result.updatedAt || new Date().toISOString();
        setUsers(
          users.map((u) =>
            u.id === editingId ? ({ ...u, ...editForm, updatedAt: newUpdatedAt } as User) : u
          )
        );
        setEditingId(null);
      } else {
        alert("บันทึกไม่สำเร็จ");
      }
    } catch {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // กรองตามรหัสพนักงาน ชื่อ หรืออีเมล
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      u.employeeId.toLowerCase().includes(query) ||
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      {/* กล่องค้นหารหัสพนักงาน / ข้อมูลผู้ใช้ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-ink-mute">
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสพนักงาน (เช่น E0001), ชื่อ หรืออีเมล..."
            className="w-full rounded-lg border border-mist bg-slip pl-9 pr-9 py-2 text-sm text-ink placeholder:text-ink-mute/70 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-ink-mute hover:text-ink"
              title="ล้างคำค้นหา"
            >
              ✕
            </button>
          )}
        </div>

        <div className="text-xs text-ink-mute">
          แสดง {filteredUsers.length} จากทั้งหมด {users.length} รายการ
        </div>
      </div>

      {/* ตารางแสดงรายชื่อพนักงาน */}
      <div className="overflow-x-auto rounded-lg border border-mist shadow-sm">
        <table className="w-full text-left text-sm text-ink-soft">
          <thead className="bg-slip border-b border-mist text-ink font-semibold">
            <tr>
              <th className="px-4 py-3 whitespace-nowrap">รหัสพนักงาน</th>
              <th className="px-4 py-3 whitespace-nowrap">อีเมล</th>
              <th className="px-4 py-3 whitespace-nowrap">ชื่อ-นามสกุล</th>
              <th className="px-4 py-3 whitespace-nowrap">บทบาท</th>
              <th className="px-4 py-3 whitespace-nowrap">สถานะ</th>
              <th className="px-4 py-3 whitespace-nowrap">แก้ไขล่าสุด (updated_at)</th>
              <th className="px-4 py-3 text-right whitespace-nowrap">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-mute">
                  ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา &quot;{searchQuery}&quot;
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slip/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border border-mist px-2 py-1 rounded w-24 bg-white text-ink text-sm font-semibold"
                          value={editForm.employeeId || ""}
                          onChange={(e) => setEditForm({ ...editForm, employeeId: e.target.value })}
                        />
                      ) : (
                        u.employeeId
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border border-mist px-2 py-1 rounded w-full bg-white text-ink"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        />
                      ) : (
                        u.email
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          className="border border-mist px-2 py-1 rounded w-full bg-white text-ink"
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      ) : (
                        u.name
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="border border-mist px-2 py-1 rounded w-full bg-white text-ink"
                          value={editForm.role || ""}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r as Role] || r} ({r})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="bg-ink/10 px-2 py-1 rounded-md text-xs font-medium text-ink whitespace-nowrap">
                          {ROLE_LABELS[u.role as Role] || u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <select
                          className="border border-mist px-2 py-1 rounded w-full bg-white text-ink"
                          value={editForm.status || ""}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        >
                          <option value="ACTIVE">ACTIVE (ปกติ)</option>
                          <option value="RESIGNED">RESIGNED (ลาออก)</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                            u.status === "ACTIVE"
                              ? "bg-ok/20 text-ok-dark"
                              : "bg-danger/20 text-danger"
                          }`}
                        >
                          {u.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-mute">
                      {formatThaiDateTime(u.updatedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-ink text-white px-3 py-1.5 rounded-md hover:bg-ink-soft disabled:opacity-50 transition text-xs font-medium cursor-pointer"
                          >
                            {saving ? "กำลังบันทึก..." : "บันทึก"}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="bg-mist text-ink px-3 py-1.5 rounded-md hover:bg-mist/80 transition text-xs font-medium cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(u)}
                          className="text-ink hover:text-stamp-dark transition underline underline-offset-2 text-sm font-medium cursor-pointer"
                        >
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
