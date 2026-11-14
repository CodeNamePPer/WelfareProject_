import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { APPROVAL_FLOW, fieldsFor } from "@/lib/claims/forms";
import { getEmployeeBenefits, getPaySettings, listClaims } from "@/lib/claims/service";
import { baht, thaiDate } from "@/lib/claims/requester";
import { DEFAULT_PAY_SETTINGS, monthOffsetLabel } from "@/features/payroll/lib/pay-settings";
import { BenefitThumb, ClaimPill, PageHead, Pill, Sheet, UsageBar, pill } from "@/features/requester/ui";

const BUDGET_TYPE = { yearly: "ต่อปี", monthly: "ต่อเดือน", per_claim: "ต่อครั้ง" };

// หน้ารายละเอียดสวัสดิการ เปิดจากปุ่ม "ดูรายละเอียด" ในหน้าสิทธิ์สวัสดิการ
export default async function WelfareDetailPage({ params }: { params: Promise<{ code: string }> }) {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const [{ code }, benefits, claims, settings] = await Promise.all([
        params,
        getEmployeeBenefits(session.sub),
        listClaims({ employeeCode: session.sub }),
        getPaySettings().catch(() => DEFAULT_PAY_SETTINGS),
    ]);
    if (!benefits) {
        return <p className="text-13 text-status-rejected">โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
    }
    // หาในสิทธิ์ของพนักงานเอง สวัสดิการที่ไม่มีสิทธิ์หรือปิดใช้งานแล้วจึงเปิดดูไม่ได้
    const benefit = benefits.find((item) => item.code === decodeURIComponent(code));
    if (!benefit) {
        notFound();
    }

    const outOfClaims = benefit.maxClaims !== null && benefit.claimsThisYear >= benefit.maxClaims;
    const canClaim = benefit.remaining > 0 && !outOfClaims;
    const formFields = fieldsFor(benefit.formType).filter((field) => !field.optional);
    const history = (claims ?? []).filter((claim) => claim.benefitCode === benefit.code && claim.status !== "cancelled");
    const conditions = [
        { label: "วงเงิน", value: `${baht(benefit.limit)} ${BUDGET_TYPE[benefit.budgetType]}` },
        { label: "จำนวนครั้ง", value: benefit.maxClaimsNote || "ไม่จำกัดจำนวนครั้ง" },
        { label: "ผู้มีสิทธิ์", value: benefit.eligibilityNote || "พนักงานทุกคน" },
        { label: "เอกสารที่ต้องแนบ", value: ["ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน", ...benefit.documents].join(", ") },
        { label: "ข้อมูลที่ต้องกรอก", value: formFields.map((field) => field.label).join(", ") },
        { label: "ผู้อนุมัติ", value: APPROVAL_FLOW },
        {
            label: "รอบจ่าย",
            value: `ยื่น 1–15 ได้รับวันที่ ${settings.round1PayDay} ${monthOffsetLabel(settings.round1MonthOffset)} · ยื่น 16–สิ้นเดือน ได้รับวันที่ ${settings.round2PayDay} ${monthOffsetLabel(settings.round2MonthOffset)}`,
        },
    ];

    return (
        <>
            <PageHead crumbs={[{ label: "สิทธิ์สวัสดิการ", href: "/employee/welfare" }, { label: benefit.name }]} title={benefit.name} description={`${benefit.code} · ${benefit.category}`} />

            <Sheet className="flex flex-wrap overflow-hidden">
                <BenefitThumb category={benefit.category} className="min-h-[200px] flex-[1_1_420px] lg:min-h-[320px]" />
                <div className="flex flex-[1_1_380px] flex-col gap-3 p-6">
                    <div>
                        <Pill tone={canClaim ? "green" : "slate"}>{canClaim ? "มีสิทธิ์" : outOfClaims ? "ครบจำนวนครั้งแล้ว" : "ใช้วงเงินครบแล้ว"}</Pill>
                    </div>
                    {benefit.description ? <p className="text-15 text-ink-soft">{benefit.description}</p> : null}
                    <div className="flex flex-col gap-1.5 rounded-lg bg-surface px-4 py-3.5">
                        <div className="flex justify-between gap-3 text-13 text-muted">
                            <span>คงเหลือใช้ได้</span>
                            {benefit.maxClaims !== null ? (
                                <span>
                                    เบิกแล้ว {benefit.claimsThisYear}/{benefit.maxClaims} ครั้ง
                                </span>
                            ) : null}
                        </div>
                        <p className="text-[26px] font-semibold tabular-nums">
                            {baht(benefit.remaining)} <span className="text-14 font-normal text-muted">/ {baht(benefit.limit)}</span>
                        </p>
                        <UsageBar used={benefit.used} pending={benefit.pending} limit={benefit.limit} />
                        <p className="text-12 text-muted">
                            ใช้ไป {baht(benefit.used)}
                            {benefit.pending > 0 ? ` · กันไว้รอตรวจ ${baht(benefit.pending)}` : ""} · ยอดที่รอตรวจถูกกันจากวงเงินทันทีที่ยื่น
                        </p>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                        {canClaim ? (
                            <Link href={`/employee/withdraw?benefit=${encodeURIComponent(benefit.code)}`} className={pill.primary}>
                                ยื่นเบิกสวัสดิการนี้
                            </Link>
                        ) : (
                            <p className="text-12 text-muted">{outOfClaims ? "เบิกครบจำนวนครั้งของปีนี้แล้ว" : "ใช้วงเงินรอบนี้ครบแล้ว"} จึงยังยื่นเบิกเพิ่มไม่ได้</p>
                        )}
                    </div>
                </div>
            </Sheet>

            <div className="flex flex-wrap items-start gap-4">
                <Sheet aria-labelledby="condition-title" className="min-w-0 flex-[999_1_520px] px-5 py-[18px]">
                    <h2 id="condition-title" className="mb-1 text-16 font-semibold">
                        เงื่อนไขการเบิก
                    </h2>
                    <dl>
                        {conditions.map((row) => (
                            <div key={row.label} className="grid gap-1 border-t border-slate-100 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
                                <dt className="text-13 text-muted">{row.label}</dt>
                                <dd className="text-14">{row.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="border-t border-slate-100 pt-3 text-12 text-muted">แนบเป็นไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB ต่อไฟล์ ใบเสร็จใบเดียวกันใช้ยื่นซ้ำไม่ได้</p>
                </Sheet>

                <Sheet aria-labelledby="history-title" className="flex-[1_1_300px] px-5 py-[18px]">
                    <h2 id="history-title" className="mb-2.5 text-16 font-semibold">
                        ประวัติการเบิกสวัสดิการนี้
                    </h2>
                    {history.length === 0 ? (
                        <p className="border-t border-slate-100 py-4 text-13 text-muted">{claims ? "ยังไม่เคยเบิกสวัสดิการนี้" : "โหลดประวัติไม่สำเร็จ"}</p>
                    ) : (
                        history.map((claim) => (
                            <Link key={claim.id} href={`/employee/status?id=${encodeURIComponent(claim.claimNo)}`} className="block border-t border-slate-100 py-2.5 text-ink no-underline hover:bg-surface">
                                <span className="flex justify-between gap-3">
                                    <span className="font-medium">{claim.claimNo}</span>
                                    <span className="tabular-nums">{baht(claim.amountRequested)}</span>
                                </span>
                                <span className="mt-1 flex items-center justify-between gap-3">
                                    <span className="text-12 text-muted">{claim.submittedAt ? `ยื่น ${thaiDate(claim.submittedAt)}` : "ยังไม่ได้ส่ง"}</span>
                                    <ClaimPill status={claim.status} />
                                </span>
                            </Link>
                        ))
                    )}
                </Sheet>
            </div>
        </>
    );
}
