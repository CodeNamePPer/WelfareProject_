import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHrEmployees } from "@/lib/hr/employees";
import { getBenefitMaxClaims } from "@/lib/hr/claimReview";
import { getEmployeeLimits } from "@/lib/hr/employeeLimits";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits, listClaims } from "@/lib/claims/service";
import { bangkokToday, thaiDate } from "@/lib/claims/requester";
import { COUNTED } from "@/features/hr/queue";
import { ButtonLink, Card, EmptyState, HrPage, PageHeader, RequesterFull, StatusBadge } from "@/features/hr/ui";
import { cx } from "@/lib/cx";
import { LimitTable, type LimitRow } from "./LimitTable";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `พนักงาน ${decodeURIComponent(id)}` };
}

const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;
// คอลัมน์ตามดีไซน์ H09
const HISTORY_COLS = "grid-cols-[150px_minmax(0,2fr)_110px_150px]";

/** อายุงาน เช่น "8 ปี 7 เดือน" นับถึงวันนี้หรือวันที่พ้นสภาพ */
function tenureOf(hireIso: string, endIso: string | null) {
  const start = new Date(`${hireIso}T00:00:00+07:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00+07:00`) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "ไม่ถึง 1 เดือน";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : ""].filter(Boolean).join(" ");
}

// H09 โปรไฟล์พนักงาน + สิทธิ์และวงเงินรายคน + ประวัติการเบิกปีนี้
export default async function EmployeeProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const code = decodeURIComponent(id);
  const employees = await getHrEmployees();
  if (employees === null) return <p className="text-13 text-status-rejected-ink">โหลดข้อมูลพนักงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  const employee = employees.find((item) => item.code === code);
  if (!employee) notFound();

  const [benefits, claims, maxClaims, limits, session] = await Promise.all([
    getEmployeeBenefits(code),
    listClaims({ employeeCode: code }),
    getBenefitMaxClaims().catch(() => null),
    getEmployeeLimits(code).catch(() => null),
    getSession(),
  ]);
  const today = bangkokToday();
  const year = today.slice(0, 4);
  const thaiYear = Number(year) + 543;
  const thisYear = (claims ?? [])
    .filter((claim) => claim.status !== "draft" && (claim.expenseDate ?? claim.submittedAt ?? claim.createdAt).startsWith(year))
    .sort((a, b) => b.claimNo.localeCompare(a.claimNo));
  const counted = thisYear.filter((claim) => COUNTED.includes(claim.status)).length;
  const maxAll = maxClaims ? [...maxClaims.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0) : 0;
  // วงเงินคนนี้ = วงเงินรายคนที่มีผลแล้ว (ถ้ามี) ไม่เช่นนั้นใช้วงเงินตามระดับ คงเหลือคิดจากวงเงินคนนี้
  const limitRows: LimitRow[] = (benefits ?? []).map((item) => {
    const custom = limits?.get(item.code);
    const own = custom?.current?.amount ?? item.limit;
    const capped = own > 0 || custom?.current != null;
    return {
      code: item.code,
      name: item.name,
      base: item.limit,
      own,
      custom: custom?.current != null,
      next: custom?.next ? `${money(custom.next.amount)} ตั้งแต่ ${thaiDate(`${custom.next.effectiveFrom}T00:00:00+07:00`)}` : null,
      claims: item.maxClaims !== null ? `${item.claimsThisYear}/${item.maxClaims}` : String(item.claimsThisYear),
      remaining: capped ? Math.max(own - item.used - item.pending, 0) : null,
    };
  });
  const remainingAll = benefits ? limitRows.reduce((sum, row) => sum + (row.remaining ?? 0), 0) : null;
  const line = [employee.code, employee.position, employee.department].filter(Boolean).join(" · ");

  return (
    <HrPage>
      <PageHeader
        crumbs={[{ label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" }, { label: employee.code }]}
        title={employee.name}
        description={line}
        actions={
          <ButtonLink href={`/hr/employees/${encodeURIComponent(employee.code)}/edit`} variant="secondary">
            แก้ไขข้อมูล
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[1_1_280px]">
          <RequesterFull
            title="พนักงาน"
            person={{
              name: employee.name,
              code: employee.code,
              position: employee.position,
              department: employee.department,
              level: employee.jobLevel,
              tenure: tenureOf(employee.hireDate, employee.status === "ACTIVE" ? null : employee.statusDate),
              supervisor: employee.manager?.name ?? null,
              employmentStatus: employee.statusLabel,
              claimsThisYear: claims ? (maxAll > 0 ? `${counted}/${maxAll} ครั้ง` : `${counted} ครั้ง`) : null,
              available: remainingAll !== null ? money(remainingAll) : null,
            }}
          />
        </div>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          <Card aria-labelledby="limits">
            <div className="flex flex-wrap justify-between gap-2 px-5 pt-3.5 pb-2">
              <h2 id="limits" className="text-16 font-semibold">
                สิทธิ์และวงเงินรายคน
              </h2>
              <span className="text-12 text-muted">
                ค่าเริ่มต้นตามระดับ{employee.jobLevel ? ` ${employee.jobLevel}` : ""} · ปรับรายคนได้ บันทึก Log
              </span>
            </div>
            {employee.status !== "ACTIVE" ? (
              <EmptyState>พนักงาน{employee.statusLabel} ไม่มีสิทธิ์เบิกสวัสดิการ</EmptyState>
            ) : !benefits ? (
              <EmptyState>โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</EmptyState>
            ) : benefits.length === 0 ? (
              <EmptyState>ยังไม่มีสวัสดิการที่มีสิทธิ์</EmptyState>
            ) : (
              <LimitTable employeeCode={employee.code} rows={limitRows} canAdjust={session?.role === "HR"} />
            )}
          </Card>

          <Card aria-labelledby="history">
            <div className="px-5 pt-3.5 pb-2">
              <h2 id="history" className="text-16 font-semibold">
                ประวัติการเบิก ปี {thaiYear}
              </h2>
            </div>
            {claims === null ? (
              <EmptyState>โหลดประวัติการเบิกไม่สำเร็จ</EmptyState>
            ) : thisYear.length === 0 ? (
              <EmptyState>ยังไม่มีคำขอในปีนี้</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  {thisYear.map((claim) => (
                    <Link
                      key={claim.claimNo}
                      href={`/hr/home/requests/${encodeURIComponent(claim.claimNo)}`}
                      className={cx("grid items-center gap-3 border-t border-[#F1F5F9] px-5 py-3 text-ink no-underline hover:bg-surface", HISTORY_COLS)}
                    >
                      <span className="text-13">{claim.claimNo}</span>
                      <span className="text-13">{claim.benefitName}</span>
                      <span className="text-right font-semibold">{money(claim.amountApproved ?? claim.amountRequested)}</span>
                      <span>
                        <StatusBadge status={claim.status} />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </HrPage>
  );
}
