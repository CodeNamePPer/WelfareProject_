import type { AuditEntry as DbAuditEntry, AuditAction as DbAuditAction } from '../../lib/auth/audit';
import { ROLE_LABELS, type Role } from '../../lib/auth/roles';
import type { AuditCategory, AuditEntry, AuditTarget } from '../../types';

type UserInfo = { name: string; role: string };

// ป้ายชื่อตรงกับ FieldSpec ใน src/app/api/admin/users/route.ts
const FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อ',
  // คอลัมน์ email ของบัญชีเก็บชื่อล็อกอิน (หน้าตั้งค่าผู้ใช้เรียกว่า "ชื่อล็อกอิน")
  email: 'ชื่อล็อกอิน',
  role: 'บทบาท',
  status: 'สถานะ',
  titleTh: 'คำนำหน้า',
  firstNameTh: 'ชื่อ (ไทย)',
  lastNameTh: 'นามสกุล (ไทย)',
  firstNameEn: 'ชื่อ (อังกฤษ)',
  lastNameEn: 'นามสกุล (อังกฤษ)',
  nickname: 'ชื่อเล่น',
  gender: 'เพศ',
  birthDate: 'วันเกิด',
  citizenId: 'เลขบัตรประชาชน',
  nationality: 'สัญชาติ',
  religion: 'ศาสนา',
  maritalStatus: 'สถานะสมรส',
  childrenCount: 'จำนวนบุตร',
  fatherFirstName: 'ชื่อบิดา',
  fatherLastName: 'นามสกุลบิดา',
  motherFirstName: 'ชื่อมารดา',
  motherLastName: 'นามสกุลมารดา',
  contactEmail: 'อีเมลติดต่อ',
  phone: 'เบอร์โทร',
  emergencyContactName: 'ผู้ติดต่อฉุกเฉิน',
  emergencyContactPhone: 'เบอร์ผู้ติดต่อฉุกเฉิน',
  addressLine: 'ที่อยู่',
  subdistrict: 'ตำบล/แขวง',
  district: 'อำเภอ/เขต',
  province: 'จังหวัด',
  postalCode: 'รหัสไปรษณีย์',
  departmentId: 'แผนก',
  positionId: 'ตำแหน่ง',
  jobLevelId: 'ระดับ',
  managerCode: 'หัวหน้า',
  hireDate: 'วันเริ่มงาน',
};
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'ทำงานอยู่', RESIGNED: 'ลาออก' };

// ป้ายชื่อตรงกับ saveWelfareItem ใน src/lib/admin/welfare.ts (ค่าใน log แปลงเป็นข้อความอ่านได้แล้ว)
const WELFARE_FIELD_LABELS: Record<string, string> = {
  name: 'ชื่อสวัสดิการ',
  amount: 'วงเงิน',
  budgetType: 'ประเภทวงเงิน',
  maxClaims: 'จำนวนครั้งที่เบิกได้',
  maxClaimsPerYear: 'จำนวนครั้งที่เบิกได้ต่อปี',
  formType: 'แบบฟอร์มยื่นคำขอ',
  documents: 'เอกสารที่ต้องแนบ',
  eligible: 'ผู้มีสิทธิ์',
  startDate: 'วันที่เริ่มใช้',
  approver: 'ผู้อนุมัติการเบิก',
  status: 'สถานะ',
};

function welfareTitle(action: DbAuditAction, fields: string[]): string {
  if (action === 'WELFARE_CREATE') return 'เพิ่มสวัสดิการใหม่';
  if (fields.length === 1 && fields[0] === 'status') return 'เปลี่ยนสถานะสวัสดิการ';
  return fields.includes('amount') || fields.includes('startDate') ? 'ปรับวงเงินสวัสดิการ' : 'แก้ไขสวัสดิการ';
}

const SECURITY_TITLES: Partial<Record<DbAuditAction, string>> = {
  LOGIN_FAILED: 'ล็อกอินไม่สำเร็จ',
  LOGIN_BLOCKED_LOCKED: 'บล็อกการล็อกอิน: บัญชีถูกล็อก',
  LOGIN_BLOCKED_RECAPTCHA: 'บล็อกการล็อกอิน: reCAPTCHA ไม่ผ่าน',
  LOGIN_BLOCKED_INACTIVE: 'บล็อกการล็อกอิน: บัญชีไม่ได้ใช้งาน',
  PASSWORD_CHANGE_FAILED: 'เปลี่ยนรหัสผ่านไม่สำเร็จ: รหัสปัจจุบันไม่ถูกต้อง',
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

/** ค่าที่พิมพ์ในช่องล็อกอิน: ถ้าตรงกับรหัสพนักงานในระบบให้ลิงก์ไปหาคนนั้น ไม่งั้นระบุว่าเป็นแค่ข้อความที่กรอก */
function targetFromIdentifier(identifier: string, users: Map<string, UserInfo>): AuditTarget {
  const user = users.get(identifier);
  return user ? { code: identifier, name: user.name, href: `/admin/users?user=${identifier}` } : { code: identifier, name: 'ชื่อที่ใช้ล็อกอิน' };
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

    if (row.action === 'WELFARE_CREATE' || row.action === 'WELFARE_UPDATE') {
      const changes = row.changes ?? {};
      const fields = Object.keys(changes);
      return [
        {
          ...base,
          title: welfareTitle(row.action, fields),
          detail: fields.map((f) => WELFARE_FIELD_LABELS[f] ?? f).join(', '),
          category: 'settings' as AuditCategory,
          action: 'welfare',
          target: row.targetId ? { code: row.targetId, name: row.detail } : undefined,
          change: {
            fields: fields.map((f) => ({
              label: WELFARE_FIELD_LABELS[f] ?? f,
              before: changes[f].old == null ? '—' : String(changes[f].old),
              after: changes[f].new == null ? '—' : String(changes[f].new),
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

    if (row.action === 'EMPLOYEE_CREATE' || row.action === 'ACCOUNT_CREATE') {
      const targetName = (row.targetId && users.get(row.targetId)?.name) || undefined;
      const isEmployee = row.action === 'EMPLOYEE_CREATE';
      return [
        {
          ...base,
          title: `${isEmployee ? 'เพิ่มพนักงาน' : 'ออกบัญชีให้'} ${targetName ?? row.targetId ?? ''}`,
          detail: row.detail ?? '',
          category: 'settings' as AuditCategory,
          action: 'user-update',
          target: row.targetId ? { code: row.targetId, name: targetName, href: `/admin/users?user=${row.targetId}` } : undefined,
          change: { fields: [], reason: row.reason },
        },
      ];
    }

    if (row.action === 'PASSWORD_RESET') {
      const targetName = (row.targetId && users.get(row.targetId)?.name) || undefined;
      return [
        {
          ...base,
          title: `รีเซ็ตรหัสผ่านของ ${targetName ?? row.targetId ?? ''}`,
          detail: row.detail ?? 'ออกรหัสชั่วคราว ต้องตั้งรหัสใหม่ตอนล็อกอิน',
          category: 'settings' as AuditCategory,
          action: 'security',
          target: row.targetId ? { code: row.targetId, name: targetName, href: `/admin/users?user=${row.targetId}` } : undefined,
          change: { fields: [], reason: row.reason },
        },
      ];
    }

    if (row.action === 'PASSWORD_CHANGE') {
      return [
        {
          ...base,
          title: 'เปลี่ยนรหัสผ่านด้วยตนเอง',
          detail: row.detail ?? '',
          category: 'settings' as AuditCategory,
          action: 'security',
          target: row.userId ? { code: row.userId, name: actor?.name, href: `/admin/users?user=${row.userId}` } : undefined,
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
          target: row.identifier ? targetFromIdentifier(row.identifier, users) : undefined,
        },
      ];
    }

    return [];
  });
}
