export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Employee {
  id: string;
  code: string;
  name: string;
}

export interface Claim {
  id: string;
  employeeId: string;
  benefit: string;
  amount: number;
  status: ClaimStatus;
  /** ISO date, YYYY-MM-DD */
  date: string;
}

export interface Period {
  id: string;
  label: string;
  from: string;
  to: string;
}

export type NotificationKind = 'access-request' | 'expiring' | 'system';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  actionLabel?: string;
}

export interface RoleCount {
  id: string;
  role: string;
  count: number;
}

export interface LogEntry {
  id: string;
  kind: 'permission' | 'system';
  title: string;
  detail: string;
  time: string;
  change?: { before: string; after: string };
}

export interface LogGroup {
  label: string;
  entries: LogEntry[];
}

export interface SummaryStats {
  totalUsers: number;
  newUsersThisCycle: number;
  hrRequests: number;
  notifications: number;
  systemErrors: number;
}

// ─── ตั้งค่าผู้ใช้งานระบบ ───────────────────────────────────────────────────

export type UserRole = 'EMPLOYEE' | 'HR' | 'FINANCE' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'RESIGNED';

export interface SystemUser {
  employeeId: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string;
  updatedAt?: string;
}
