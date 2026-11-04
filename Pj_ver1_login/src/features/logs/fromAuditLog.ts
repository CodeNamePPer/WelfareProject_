import type { AuditEntry as DbAuditEntry, AuditAction as DbAuditAction } from '../../lib/auth/audit';
import { ROLE_LABELS, type Role } from '../../lib/auth/roles';
import type { AuditCategory, AuditEntry, AuditTarget } from '../../types';

type UserInfo = { name: string; role: string };

const FIELD_LABELS: Record<string, string> = { name: 'ชื่อ', email: 'อีเมล', role: 'บทบาท', status: 'สถานะ' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'ทำงานอยู่', RESIGNED: 'ลาออก' };

const SECURITY_TITLES: Partial<Record<DbAuditAction, string>> = {
  LOGIN_FAILED: 'ล็อกอินไม่สำเร็จ',
  LOGIN_BLOCKED_LOCKED: 'บล็อกการล็อกอิน: บัญชีถูกล็อก',
  LOGIN_BLOCKED_RECAPTCHA: 'บล็อกการล็อกอิน: reCAPTCHA ไม่ผ่าน',
  LOGIN_BLOCKED_INACTIVE: 'บล็อกการล็อกอิน: บัญชีไม่ได้ใช้งาน',
};

const roleLabel = (role: string) => ROLE_LABELS[role as Role] ?? role;

function fieldValue(field: string, value: unknown): string {
  const text = value == null ? '—' : String(value);
  if (field === 'role') return roleLabel(text);
  if (field === 'status') return STATUS_LABELS[text] ?? text;
  return text;
}

/** ISO (UTC) → "YYYY-MM-DDTHH:mm" เวลาไทย ตามรูปแบบที่ LogsPage ใช้ */
function toBangkokLocal(iso: string): string {
  return new Date(iso)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Bangkok', hour12: false })
    .slice(0, 16)
    .replace(' ', 'T');
}

/** ล็อกอินด้วยรหัสพนักงานหรืออีเมล: ถ้าตรงกับผู้ใช้ในระบบให้ลิงก์ไปหาคนนั้น */
function targetFromIdentifier(identifier: string, users: Map<string, UserInfo>): AuditTarget {
  const user = users.get(identifier);
  return user ? { code: identifier, name: user.name, href: `/admin/users?user=${identifier}` } : { code: identifier };
}

/**
 * แปลงแถวจาก Supabase `audit_logs` เป็นรายการที่หน้า Log แสดง
 * ล็อกอิน/ออกสำเร็จไม่ถือเป็นการแก้ไข จึงไม่แสดงในหน้านี้
 */
export function toLogEntries(rows: DbAuditEntry[], users: Map<string, UserInfo>): AuditEntry[] {
  return rows.flatMap((row): AuditEntry[] => {
    const actor = row.userId ? users.get(row.userId) : undefined;
    const base = {
      id: row.id ?? `${row.at}-${row.action}`,
      at: toBangkokLocal(row.at),
      actor: row.userId ? (actor ? `${actor.name} (${row.userId})` : row.userId) : 'ระบบ',
      actorRole: actor ? roleLabel(actor.role) : 'ระบบ',
      ip: row.ip ?? undefined,
    };

    if (row.action === 'USER_UPDATE') {
      const changes = row.changes ?? {};
      const fields = Object.keys(changes);
      const targetName = (row.targetId && users.get(row.targetId)?.name) || undefined;
      const isRoleOnly = fields.length === 1 && fields[0] === 'role';
      return [
        {
          ...base,
          title: isRoleOnly ? `เปลี่ยนบทบาทของ ${targetName ?? row.targetId ?? ''}` : `แก้ไขข้อมูลผู้ใช้ ${targetName ?? row.targetId ?? ''}`,
          detail: fields.map((f) => FIELD_LABELS[f] ?? f).join(', '),
          category: 'settings' as AuditCategory,
          action: fields.includes('role') ? 'role-change' : 'user-update',
          target: row.targetId ? { code: row.targetId, name: targetName, href: `/admin/users?user=${row.targetId}` } : undefined,
          change: {
            fields: fields.map((f) => ({
              label: FIELD_LABELS[f] ?? f,
              before: fieldValue(f, changes[f].old),
              after: fieldValue(f, changes[f].new),
            })),
            reason: row.reason,
          },
        },
      ];
    }

    if (row.action === 'NOTIFICATION_RESOLVE') {
      return [
        {
          ...base,
          title: 'ตรวจสอบการแจ้งเตือนแล้ว',
          detail: row.detail ?? '',
          category: 'settings' as AuditCategory,
          target: row.targetId ? { code: `แจ้งเตือน #${row.targetId}`, href: '/admin/notifications' } : undefined,
          action: 'system',
        },
      ];
    }

    const securityTitle = SECURITY_TITLES[row.action];
    if (securityTitle) {
      return [
        {
          ...base,
          title: securityTitle,
          detail: row.detail ?? '',
          category: 'issue',
          action: 'security',
          result: 'failed',
          target: row.identifier ? targetFromIdentifier(row.identifier, users) : undefined,
        },
      ];
    }

    return [];
  });
}
