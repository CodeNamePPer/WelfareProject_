export const ROLES = [
  "EMPLOYEE",
  "HR",
  "FINANCE",
  "SUPER_ADMIN",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  EMPLOYEE: "พนักงาน",
  HR: "ฝ่ายบุคคล (HR)",
  FINANCE: "ฝ่ายการเงิน (Finance)",
  SUPER_ADMIN: "Admin",
};

/**
 * เส้นทางที่จำกัดเฉพาะบาง Role (ตรวจแบบ prefix)
 * เส้นทางที่ไม่อยู่ในรายการนี้ = ทุก Role ที่ล็อกอินแล้วเข้าได้
 */
export const ROUTE_ROLES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/hr", roles: ["HR", "SUPER_ADMIN"] },
  { prefix: "/finance", roles: ["FINANCE", "SUPER_ADMIN"] },
  { prefix: "/admin", roles: ["SUPER_ADMIN"] },
  // ใช้กฎแรกที่ตรง จึงต้องวาง /payroll/history ไว้ก่อน /payroll
  { prefix: "/payroll/history", roles: ["FINANCE", "SUPER_ADMIN"] },
  { prefix: "/payroll", roles: ["FINANCE"] },
];

export function canAccess(pathname: string, role: Role): boolean {
  const rule = ROUTE_ROLES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  return rule ? rule.roles.includes(role) : true;
}
