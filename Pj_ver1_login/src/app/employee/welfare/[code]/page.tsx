import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Tag } from "@/components/ui/Tag";
import { getSession } from "@/lib/auth/get-session";
import { fieldsFor } from "@/lib/claims/forms";
import { getEmployeeBenefits } from "@/lib/claims/service";

const number = new Intl.NumberFormat("th-TH");
const BUDGET_TYPE = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };

// หน้ารายละเอียดสวัสดิการ เปิดจากปุ่ม "ดูรายละเอียด" ในหน้าสิทธิ์สวัสดิการ
export default async function WelfareDetailPage({ params }: { params: Promise<{ code: string }> }) {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const [{ code }, benefits] = await Promise.all([params, getEmployeeBenefits(session.sub)]);
    if (!benefits) {
        return <p className="text-13 text-status-rejected">โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
    }
    // หาในสิทธิ์ของพนักงานเอง สวัสดิการที่ไม่มีสิทธิ์หรือปิดใช้งานแล้วจึงเปิดดูไม่ได้
    const benefit = benefits.find((item) => item.code === decodeURIComponent(code));
    if (!benefit) {
        notFound();
    }

    const canClaim = benefit.remaining > 0;
    const usedPercent = benefit.limit > 0 ? Math.min((benefit.used / benefit.limit) * 100, 100) : 0;
    const pendingPercent = benefit.limit > 0 ? Math.min((benefit.pending / benefit.limit) * 100, 100 - usedPercent) : 0;
    const formFields = fieldsFor(benefit.formType).filter((field) => !field.optional);

    return (
        <div className="mx-auto max-w-[1080px] space-y-3 px-1 py-3 text-ink">
            <Breadcrumb items={[{ label: "สิทธิ์สวัสดิการ", href: "/employee/welfare" }, { label: benefit.name }]} />

            <article className="rounded-lg border border-line bg-white">
                <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4 sm:p-5">
                    <div className="min-w-0">
                        <p className="text-12 text-muted">
                            {benefit.category} · {benefit.code}
                        </p>
                        <h1 className="mt-1 text-22 font-semibold">{benefit.name}</h1>
                        {benefit.description ? <p className="mt-2 max-w-[64ch] text-13 leading-6 text-muted">{benefit.description}</p> : null}
                    </div>
                    <Tag tone={canClaim ? "success" : "neutral"}>{canClaim ? "ใช้สิทธิ์ได้" : "ใช้สิทธิ์ครบแล้ว"}</Tag>
                </header>

                <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-6 p-4 sm:p-5">
                        <section aria-labelledby="evidence-title">
                            <h2 id="evidence-title" className="text-15 font-semibold">
                                หลักฐานที่ต้องแนบ
                            </h2>
                            <ol className="mt-3 list-decimal space-y-2 pl-5 text-13 leading-6">
                                <li>
                                    ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน
                                    <span className="block text-12 text-muted">ต้องเห็นเลขที่ใบเสร็จ วันที่ และยอดเงินชัดเจน เพราะต้องกรอกเลขที่และวันที่ตอนยื่น</span>
                                </li>
                                {benefit.documents.map((document) => (
                                    <li key={document}>{document}</li>
                                ))}
                            </ol>
                            <p className="mt-3 text-12 leading-5 text-muted">
                                แนบเป็นไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB ต่อไฟล์ อย่างน้อย 1 ไฟล์ ใบเสร็จใบเดียวกันใช้ยื่นซ้ำไม่ได้
                            </p>
                        </section>

                        <section aria-labelledby="form-title">
                            <h2 id="form-title" className="text-15 font-semibold">
                                ข้อมูลที่ต้องกรอกในแบบฟอร์ม
                            </h2>
                            <ul className="mt-3 grid list-disc gap-x-6 gap-y-1 pl-5 text-13 leading-6 sm:grid-cols-2">
                                {formFields.map((field) => (
                                    <li key={field.key}>{field.label}</li>
                                ))}
                            </ul>
                        </section>

                        <section aria-labelledby="condition-title">
                            <h2 id="condition-title" className="text-15 font-semibold">
                                เงื่อนไขการเบิก
                            </h2>
                            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-13">
                                <dt className="text-muted">ประเภทวงเงิน</dt>
                                <dd>{BUDGET_TYPE[benefit.budgetType]}</dd>
                                <dt className="text-muted">จำนวนครั้งที่เบิกได้</dt>
                                <dd>{benefit.maxClaimsNote || "ไม่จำกัดจำนวนครั้ง"}</dd>
                                <dt className="text-muted">ผู้มีสิทธิ์</dt>
                                <dd>{benefit.eligibilityNote || "พนักงานทุกคน"}</dd>
                                <dt className="text-muted">ขั้นตอนอนุมัติ</dt>
                                <dd>HR ตรวจสอบ แล้วส่งต่อการเงินจ่ายเงิน</dd>
                            </dl>
                        </section>
                    </div>

                    <section aria-labelledby="budget-title" className="border-t border-line p-4 sm:p-5 lg:border-t-0 lg:border-l">
                        <h2 id="budget-title" className="text-15 font-semibold">
                            วงเงินของคุณ
                        </h2>
                        <p className="mt-3 text-12 text-muted">คงเหลือ</p>
                        <p className="text-22 font-semibold tabular-nums">
                            {number.format(benefit.remaining)} <span className="text-13 font-normal text-muted">บาท</span>
                        </p>
                        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                            <div className="bg-primary-600" style={{ width: `${usedPercent}%` }} />
                            <div className="bg-primary-100" style={{ width: `${pendingPercent}%` }} />
                        </div>
                        <dl className="mt-4 space-y-2 text-13">
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted">วงเงินต่อ{benefit.budgetLabel}</dt>
                                <dd className="tabular-nums">{number.format(benefit.limit)} บาท</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted">ใช้ไปแล้ว</dt>
                                <dd className="tabular-nums">{number.format(benefit.used)} บาท</dd>
                            </div>
                            <div className="flex justify-between gap-3">
                                <dt className="text-muted">รอตรวจสอบ</dt>
                                <dd className="tabular-nums">{number.format(benefit.pending)} บาท</dd>
                            </div>
                        </dl>
                        <p className="mt-3 text-12 leading-5 text-muted">ยอดที่รอตรวจสอบถูกกันจากวงเงินคงเหลือทันทีที่ยื่น</p>
                    </section>
                </div>

                <footer className="flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                    {canClaim ? null : <p className="text-12 text-muted sm:mr-auto">ใช้วงเงินรอบนี้ครบแล้ว จึงยังยื่นเบิกเพิ่มไม่ได้</p>}
                    <Link
                        href="/employee/welfare"
                        className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-13 font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                        กลับ
                    </Link>
                    {canClaim ? (
                        <Link
                            href={`/employee/withdraw?benefit=${encodeURIComponent(benefit.code)}`}
                            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-13 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                        >
                            ยื่นเบิกสวัสดิการนี้
                        </Link>
                    ) : null}
                </footer>
            </article>
        </div>
    );
}
