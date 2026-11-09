import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Heart, Search } from "lucide-react";
import { getSession } from "@/lib/auth/get-session";
import { getEmployeeBenefits } from "@/lib/claims/service";

const number = new Intl.NumberFormat("th-TH");

export default async function WelfarePage() {
    const session = await getSession();
    if (!session) {
        redirect("/login");
    }

    const benefits = await getEmployeeBenefits(session.sub);
    if (!benefits) {
        return <p className="text-13 text-status-rejected">โหลดสิทธิ์สวัสดิการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
    }

    const welfareItems = benefits.map((benefit) => ({
        category: benefit.category,
        title: benefit.name,
        description: benefit.description ?? "เบิกตามเงื่อนไขสวัสดิการของบริษัท",
        amount: `${number.format(benefit.limit)} บาท / ${benefit.budgetLabel}`,
        remaining: `คงเหลือ ${number.format(benefit.remaining)} บาท`,
        status: benefit.remaining > 0 ? "ใช้สิทธิ์ได้" : "ใช้สิทธิ์ครบแล้ว",
        href: `/employee/withdraw?benefit=${encodeURIComponent(benefit.code)}`,
    }));
    const categories = [...new Set(welfareItems.map((item) => item.category))];

    return (
        <div className="mx-auto max-w-[1280px] space-y-4 px-1 py-3 text-ink">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex h-[42px] w-full items-center gap-3 border border-line bg-white px-3 md:max-w-[760px]">
                    <Search className="size-4 shrink-0 text-muted" aria-hidden="true" />
                    <input
                        type="text"
                        placeholder="ค้นหาสวัสดิการ..."
                        className="w-full border-0 bg-transparent text-13 text-ink-soft outline-none placeholder:text-muted"
                    />
                </div>

                <div className="rounded border border-line bg-white">
                    <select aria-label="ปีของสิทธิ์" className="h-10 rounded-lg bg-white px-3 text-13 text-ink-soft outline-none">
                        <option>สิทธิ์ปี {new Date().getFullYear() + 543}</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {['ทั้งหมด', ...categories].map((tab, index) => (
                    <button
                        type="button"
                        key={tab}
                        className={index === 0
                            ? 'h-9 rounded-lg px-4 border border-primary-100 bg-primary-50 text-13 font-medium text-primary-600 hover:bg-primary-100'
                            : 'h-9 rounded-lg px-4 border border-line bg-white text-13 text-ink-soft hover:bg-surface'}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="text-13 text-muted">
                สิทธิ์ที่คุณใช้ได้ <span className="font-medium text-ink-soft">{welfareItems.length}</span> รายการ
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {welfareItems.map((item) => (
                    <div key={item.title} className="flex h-full flex-col rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition duration-200 ease-out hover:-translate-y-0.5 hover:border-line hover:shadow-[0_8px_18px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-100 text-primary-600 ring-1 ring-inset ring-sky-100">
                                <Heart className="h-4 w-4" />
                            </div>
                            <span className="rounded-full border border-status-approved-soft bg-status-approved-soft px-2 py-1 text-10 font-medium text-status-approved-ink">
                                {item.status}
                            </span>
                        </div>

                        <div className="mt-4 space-y-2">
                            <p className="text-11 font-medium uppercase tracking-[0.12em] text-muted">{item.category}</p>
                            <p className="text-15 font-semibold text-ink">{item.title}</p>
                            <p className="min-h-[2.5rem] text-13 leading-5 text-muted">{item.description}</p>
                        </div>

                        <div className="mt-4 rounded-xl border border-line bg-surface/80 p-3">
                            <div className="grid grid-cols-2 gap-3 text-13">
                                <div>
                                    <div className="text-11 uppercase tracking-[0.08em] text-muted">วงเงิน</div>
                                    <div className="mt-1 font-semibold text-ink">{item.amount}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-11 uppercase tracking-[0.08em] text-muted">เหลือ</div>
                                    <div className="mt-1 font-semibold text-primary-600">{item.remaining}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <Link
                                href={item.href}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary-100 bg-primary-50 px-3 py-2.5 text-13 font-medium text-primary-600 transition duration-200 ease-out hover:bg-primary-100"
                            >
                                <span>ยื่นเบิกสวัสดิการ</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
