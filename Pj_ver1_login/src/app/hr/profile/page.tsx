import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getMyProfile } from "@/lib/employee/profile";
import { getEmployeeBenefits, getPaySettings } from "@/lib/claims/service";
import { nextPayDate, thaiDate } from "@/lib/claims/requester";
import { getPrimaryBankAccount } from "@/lib/hr/bankAccount";
import { getHrHeadCode, isHrHead } from "@/lib/hr/hrHead";
import { getHrProfileExtras, getProfileSettings } from "@/lib/hr/profile";
import { DEFAULT_PAY_SETTINGS } from "@/features/payroll/lib/pay-settings";
import { HrPage } from "@/features/hr/ui";
import { isEmailConfigured } from "@/lib/email/resend";
import { ProfileClient, type ProfileData } from "@/features/hr/ProfileClient";
import { TZ, loginTime, plain, tenureOf } from "@/lib/hr/profileFormat";

export const metadata: Metadata = { title: "โปรไฟล์ของฉัน" };
export const dynamic = "force-dynamic";

// P01 / P02 โปรไฟล์ของฉัน (HR และหัวหน้า HR) 5 แท็บ
export default async function HrProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const [profile, extras, head, headCode, benefits, account, settings, personal] = await Promise.all([
    getMyProfile(session.sub),
    getHrProfileExtras(session.sub),
    isHrHead(session),
    getHrHeadCode(),
    getEmployeeBenefits(session.sub).catch(() => null),
    getPrimaryBankAccount(session.sub).catch(() => null),
    getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    getProfileSettings(session.sub).catch(() => null),
  ]);
  if (!profile || !extras) return <p className="text-13 text-status-rejected-ink">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const headName = headCode && headCode !== session.sub ? ((await getMyProfile(headCode))?.name ?? null) : null;
  const limit = benefits ? benefits.reduce((sum, item) => sum + item.limit, 0) : null;
  const remaining = benefits ? benefits.reduce((sum, item) => sum + Math.max(item.remaining, 0), 0) : null;
  const claims = benefits ? benefits.reduce((sum, item) => sum + item.claimsThisYear, 0) : null;
  const maxClaims = benefits ? benefits.reduce((sum, item) => sum + (item.maxClaims ?? 0), 0) : 0;
  const hireDate = extras.hireDate;
  const year = Number(new Date().toLocaleDateString("sv-SE", { timeZone: TZ }).slice(0, 4)) + 543;

  const data: ProfileData = {
    head,
    emailEnabled: isEmailConfigured(),
    name: profile.name,
    initials: profile.initials,
    photoUrl: profile.photoUrl,
    code: profile.code,
    position: profile.position,
    department: profile.department,
    managerName: profile.managerName,
    roles: ["พนักงาน", "HR", ...(head ? ["หัวหน้า HR"] : []), ...(extras.departmentHead ? ["หัวหน้าแผนก"] : [])],
    loginEmail: extras.loginEmail,
    hireDate: hireDate ? thaiDate(hireDate) : profile.hireDate,
    statusLabel: profile.statusLabel,
    phone: profile.phone,
    emergencyContact: profile.emergencyContact,
    address: profile.address,
    jobLevel: profile.jobLevel,
    directReports: extras.directReports,
    tenure: hireDate ? tenureOf(hireDate) : "—",
    grantedNote: `บทบาทกำหนดโดย Admin${extras.hrGrantedAt ? ` · ได้รับบทบาท HR เมื่อ ${thaiDate(extras.hrGrantedAt)}` : ""}`,
    stats: head
      ? [
          { label: "ข้อเสนอรออนุมัติ", value: String(extras.proposals.pending), note: `จาก HR ${extras.proposals.fromHr} · Admin ${extras.proposals.fromAdmin}` },
          { label: "อนุมัติสวัสดิการปีนี้", value: String(extras.proposals.approvedThisYear), note: `เปิดใช้อยู่ ${extras.proposals.activeBenefits} รายการ` },
        ]
      : [
          { label: "ตรวจคำขอเดือนนี้", value: String(extras.review.total), note: `อนุมัติ ${extras.review.approved} · ส่งกลับ ${extras.review.returned} · ไม่อนุมัติ ${extras.review.rejected}` },
          { label: "เวลาตรวจเฉลี่ย", value: extras.review.averageDays === null ? "—" : `${extras.review.averageDays.toFixed(1)} วัน`, note: "เป้าหมายไม่เกิน 3 วัน" },
        ],
    budget:
      limit !== null && remaining !== null
        ? {
            title: `วงเงินของฉัน ปีงบ ${year}`,
            remaining: `฿${plain(remaining)}`,
            note: `ใช้ได้ จาก ฿${plain(limit)}${profile.jobLevel ? ` ตามระดับ ${profile.jobLevel}` : ""}`,
            usedPercent: limit > 0 ? Math.min(100, Math.max(0, ((limit - remaining) / limit) * 100)) : 0,
            claims: maxClaims > 0 ? `เบิกแล้ว ${claims}/${maxClaims} ครั้ง` : `เบิกแล้ว ${claims} ครั้ง`,
            reviewer: head ? "ผู้ตรวจคำขอของคุณ: HR คนอื่น (ตรวจคำขอของตัวเองไม่ได้)" : `ผู้ตรวจคำขอของคุณ: HR คนอื่น หรือ ${headName ? `${headName} (หัวหน้า HR)` : "หัวหน้า HR"}`,
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
  };

  return (
    <HrPage>
      <ProfileClient data={data} />
    </HrPage>
  );
}
