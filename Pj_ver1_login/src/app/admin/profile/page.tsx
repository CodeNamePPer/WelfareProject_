import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getAdminAlerts } from "@/lib/admin/alerts";
import { getMyProfile } from "@/lib/employee/profile";
import { getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { nextPayDate, thaiDate } from "@/lib/claims/requester";
import { getPrimaryBankAccount } from "@/lib/hr/bankAccount";
import { getHrProfileExtras, getProfileSettings } from "@/lib/hr/profile";
import { TZ, loginTime, plain, tenureOf } from "@/lib/hr/profileFormat";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { HrPage } from "@/features/hr/ui";
import { ProfileClient, type ProfileData } from "@/features/hr/ProfileClient";
import { isEmailConfigured } from "@/lib/email/resend";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };

// อ่านใหม่ทุกครั้งให้ตรงกับที่แก้ในหน้าตั้งค่าผู้ใช้งาน
export const dynamic = "force-dynamic";

// สิทธิ์ของ Admin ในระบบ
const ADMIN_RIGHTS = [
  "ตั้งค่าผู้ใช้งานระบบ กำหนดบทบาท รีเซ็ตรหัสผ่าน",
  "เสนอสร้าง แก้ไข หรือปิดสวัสดิการ ผ่านหัวหน้า HR",
  "ดูคำขอเบิกทั้งหมด (อ่านอย่างเดียว)",
  "ดูประวัติของระบบ (Log) และแจ้งเตือนความปลอดภัย",
];

// เรื่องที่ส่งอีเมลถึง Admin ได้ (lib/hr/emailNotify.ts)
const ADMIN_TOPICS: [string, string, string][] = [
  ["proposal_decided", "ผลข้อเสนอสวัสดิการ", "หัวหน้า HR อนุมัติหรือขอข้อมูลเพิ่ม"],
  ["my_claim_status", "สถานะคำขอเบิกของฉัน", "ในฐานะพนักงาน"],
];

// โปรไฟล์ของ Admin ในดีไซน์ C เดียวกับโปรไฟล์ของ HR (P01 5 แท็บ)
export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, extras, benefits, account, settings, personal, alerts] = await Promise.all([
    getMyProfile(session.sub),
    getHrProfileExtras(session.sub),
    getEmployeeBenefits(session.sub).catch(() => null),
    getPrimaryBankAccount(session.sub).catch(() => null),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getProfileSettings(session.sub).catch(() => null),
    getAdminAlerts(session.sub),
  ]);
  if (!profile || !extras) return <p className="text-13 text-status-rejected-ink">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const limit = benefits ? benefits.reduce((sum, item) => sum + item.limit, 0) : null;
  const remaining = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const claims = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;
  const maxClaims = benefits ? benefits.reduce((sum, item) => sum + (item.maxClaims ?? 0), 0) : 0;
  const hireDate = extras.hireDate;
  const year = Number(new Date().toLocaleDateString("sv-SE", { timeZone: TZ }).slice(0, 4)) + 543;
  const actionable = alerts.filter((alert) => alert.actionable).length;
  const unread = alerts.filter((alert) => alert.unread).length;

  const data: ProfileData = {
    head: false,
    emailEnabled: isEmailConfigured(),
    name: profile.name,
    initials: profile.initials,
    code: profile.code,
    position: profile.position,
    department: profile.department,
    managerName: profile.managerName,
    roles: ["พนักงาน", "Admin", ...(extras.departmentHead ? ["หัวหน้าแผนก"] : [])],
    loginEmail: extras.loginEmail,
    hireDate: hireDate ? thaiDate(hireDate) : profile.hireDate,
    statusLabel: profile.statusLabel,
    phone: profile.phone,
    emergencyContact: profile.emergencyContact,
    address: profile.address,
    jobLevel: profile.jobLevel,
    directReports: extras.directReports,
    tenure: hireDate ? tenureOf(hireDate) : "—",
    grantedNote: "บทบาท Admin ผู้ดูแลระบบ",
    stats: [
      { label: "ข้อเสนอจาก Admin รออนุมัติ", value: String(extras.proposals.fromAdmin), note: "รอหัวหน้า HR พิจารณา" },
      { label: "แจ้งเตือนรอดำเนินการ", value: String(actionable), note: `ยังไม่ได้อ่าน ${unread} รายการ` },
    ],
    budget:
      limit !== null && remaining !== null
        ? {
            title: `วงเงินของฉัน ปีงบ ${year}`,
            remaining: `฿${plain(remaining)}`,
            note: `ใช้ได้ จาก ฿${plain(limit)}${profile.jobLevel ? ` ตามระดับ ${profile.jobLevel}` : ""}`,
            usedPercent: limit > 0 ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : 0,
            claims: maxClaims > 0 ? `เบิกแล้ว ${claims}/${maxClaims} ครั้ง` : `เบิกแล้ว ${claims} ครั้ง`,
            reviewer: "ผู้ตรวจคำขอของคุณ: HR",
            nextPay: `รอบจ่ายถัดไป ${thaiDate(nextPayDate(settings))}`,
          }
        : null,
    account: account ? { bank: account.bankCode, number: account.accountMasked } : null,
    employmentType: personal?.employmentType ?? null,
    contact: personal?.contact ?? { phone: profile.phone ?? "", emergency_contact_name: "", emergency_contact_phone: "", address_line: profile.address ?? "" },
    maritalStatus: personal?.maritalStatus ?? null,
    childrenCount: personal?.childrenCount ?? null,
    pendingEditRequest: personal?.pendingEditRequest ?? false,
    notifications: personal?.notifications ?? {},
    logins: extras.logins.map((item) => ({ label: `เข้าสู่ระบบสำเร็จ${item.ip ? ` · IP ${item.ip}` : ""}`, at: loginTime(item.at) })),
    rights: ADMIN_RIGHTS,
    topics: ADMIN_TOPICS,
    contactNote: "แก้ข้อมูลตัวเองไม่ได้ ส่งคำขอให้ HR ตรวจ",
  };

  return (
    <HrPage>
      <ProfileClient data={data} />
    </HrPage>
  );
}
