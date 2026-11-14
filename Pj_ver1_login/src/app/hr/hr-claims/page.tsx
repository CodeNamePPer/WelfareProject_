import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { isHrHead } from "@/lib/hr/hrHead";
import { listHrClaimsForHead } from "@/lib/hr/hrClaims";
import { getQueueFields } from "@/lib/hr/claimReview";
import { baht, thaiDayMonth } from "@/lib/claims/requester";
import { claimKindOf } from "@/features/hr/queue";
import { Badge, ButtonLink, Card, HrPage, PageHeader, RequesterCompact, buttonClass } from "@/features/hr/ui";

export const metadata: Metadata = { title: "คำขอเบิกของ HR" };
export const dynamic = "force-dynamic";

// คอลัมน์ชุดเดียวกับคิวคำขอ (H01)
const COLS = "grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_150px_130px]";

// HH4 คำขอเบิกของ HR: เฉพาะหัวหน้า HR · แถวเปิดหน้าตรวจคำขอเดิม (ตัดสินที่หน้านั้นเท่านั้น)
export default async function HrClaimsPage() {
  const session = await getSession();
  if (!session || !(await isHrHead(session))) redirect("/hr/home");

  const [claims, employees] = await Promise.all([listHrClaimsForHead(session.sub), getHrEmployees()]);
  if (!claims) return <p className="text-13 text-status-rejected-ink">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const extra = await getQueueFields(claims.map((claim) => claim.id)).catch(() => new Map<string, { proxyReason: string | null; insurancePaid: number | null }>());
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
  const rows = claims.map((claim) => {
    const person = byCode.get(claim.employeeCode);
    const returned = claim.status === "finance_returned" ? [...claim.events].reverse().find((event) => event.kind === "returned") : null;
    return {
      claimNo: claim.claimNo,
      href: `/hr/home/requests/${encodeURIComponent(claim.claimNo)}`,
      person: {
        name: person?.name ?? claim.employeeName,
        code: claim.employeeCode,
        position: person?.position ?? null,
        department: person?.department ?? claim.department,
        proxyBy: claim.submittedByCode !== claim.employeeCode ? claim.submittedByName : null,
      },
      benefitName: claim.benefitName,
      meta: [claim.claimNo, claimKindOf({ insurancePaid: extra.get(claim.id)?.insurancePaid }).short, claim.submittedAt ? `ยื่น ${thaiDayMonth(claim.submittedAt)}` : null].filter(Boolean).join(" · "),
      hint: returned ? `การเงินส่งกลับ${returned.note ? `: ${returned.note}` : ""}` : null,
      amount: claim.amountApproved ?? claim.amountRequested,
    };
  });

  return (
    <HrPage>
      <PageHeader title="คำขอเบิกของ HR" description="คำขอของ HR ต้องให้หัวหน้า HR ตรวจ" />
      <Card>
        {rows.length === 0 ? (
          <p className="px-5 py-10 text-center text-13 text-muted">ไม่มีคำขอของ HR ที่รอคุณตรวจ</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <div className="min-w-[900px]">
                <div className={`grid gap-3.5 rounded-t-[8px] bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted ${COLS}`}>
                  <span>ผู้ขอ</span>
                  <span>คำขอ</span>
                  <span className="text-right">จำนวนเงิน</span>
                  <span>สถานะ</span>
                  <span />
                </div>
                {rows.map((row) => (
                  <Link
                    key={row.claimNo}
                    href={row.href}
                    className={`grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3.5 text-ink no-underline transition-colors hover:bg-surface focus-visible:bg-surface focus-visible:outline-none motion-reduce:transition-none ${COLS}`}
                  >
                    <RequesterCompact person={row.person} />
                    <span className="block min-w-0">
                      <span className="block font-medium">{row.benefitName}</span>
                      <span className="block text-12 text-muted">{row.meta}</span>
                      {row.hint ? <span className="block text-12 text-[#92400E]">{row.hint}</span> : null}
                    </span>
                    <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                    <span>
                      <Badge tone="review">รอหัวหน้า HR ตรวจ</Badge>
                    </span>
                    <span className="text-right">
                      <span className={buttonClass("secondary", "sm")}>ตรวจคำขอ</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
            <ul className="m-0 list-none p-0 md:hidden">
              {rows.map((row) => (
                <li key={row.claimNo} className="flex flex-col gap-2.5 border-t border-[#F1F5F9] px-4 py-3.5 first:border-t-0">
                  <RequesterCompact person={row.person} />
                  <span className="block min-w-0">
                    <span className="block font-medium">{row.benefitName}</span>
                    <span className="block text-12 text-muted">{row.meta}</span>
                    {row.hint ? <span className="block text-12 text-[#92400E]">{row.hint}</span> : null}
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <Badge tone="review">รอหัวหน้า HR ตรวจ</Badge>
                    <span className="font-semibold tabular-nums">{baht(row.amount)}</span>
                  </span>
                  <ButtonLink href={row.href} variant="secondary" size="sm" className="w-full">
                    ตรวจคำขอ
                  </ButtonLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </HrPage>
  );
}
