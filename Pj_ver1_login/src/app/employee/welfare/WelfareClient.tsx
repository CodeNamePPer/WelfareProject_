'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { EmployeeBenefit } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { BenefitThumb, PageHead, Sheet, UsageBar, inputClass, pill } from '@/features/requester/ui';
import { Search } from 'lucide-react';

const ALL = 'ทั้งหมด';

export default function WelfareClient({ benefits, roleNote }: { benefits: EmployeeBenefit[]; roleNote: string }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState(ALL);

    const categories = [...new Set(benefits.map((benefit) => benefit.category))];
    const q = query.trim().toLowerCase();
    const matchesQuery = (benefit: EmployeeBenefit) =>
        !q || `${benefit.name} ${benefit.code} ${benefit.category} ${benefit.description ?? ''}`.toLowerCase().includes(q);
    // จำนวนบนแต่ละหมวดนับตามคำค้นปัจจุบัน จะได้รู้ว่าผลค้นหาอยู่หมวดไหน
    const searched = benefits.filter(matchesQuery);
    const shown = searched.filter((benefit) => category === ALL || benefit.category === category);
    const chips = [{ id: ALL, count: searched.length }, ...categories.map((name) => ({ id: name, count: searched.filter((benefit) => benefit.category === name).length }))];

    return (
        <>
            <PageHead title="สิทธิ์สวัสดิการ" description={`สวัสดิการที่คุณมีสิทธิ์ ${benefits.length} รายการ ปีงบ ${new Date().getFullYear() + 543}${roleNote ? ` ${roleNote}` : ''}`} />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="กรองสวัสดิการ" className="flex flex-wrap gap-1.5">
                    {chips.map((chip) => {
                        const active = chip.id === category;
                        return (
                            <button
                                key={chip.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setCategory(chip.id)}
                                className={cx(
                                    'h-8 rounded-full px-3.5 text-13 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1',
                                    active ? 'bg-ink text-white' : 'border border-slate-300 bg-white text-ink-soft hover:bg-surface',
                                )}
                            >
                                {chip.id} <span className="tabular-nums">{chip.count}</span>
                            </button>
                        );
                    })}
                </div>
                <label className="relative block w-full sm:w-[260px]">
                    <span className="sr-only">ค้นหาสวัสดิการ</span>
<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
    <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="ค้นหาสวัสดิการ..."
        className={cx(inputClass, '!h-9 !pl-9')}
    />
</label>
            </div>

            {shown.length === 0 ? (
                <Sheet className="px-4 py-10 text-center text-13 text-muted">
                    <p>{benefits.length === 0 ? 'ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้ในขณะนี้' : 'ไม่พบสวัสดิการที่ตรงกับการค้นหา'}</p>
                    {benefits.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setCategory(ALL);
                            }}
                            className="mt-2 text-primary-600 underline-offset-4 hover:underline"
                        >
                            ล้างการค้นหา
                        </button>
                    ) : null}
                </Sheet>
            ) : (
                <ul aria-label="รายการสวัสดิการ" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {shown.map((benefit) => {
                        const outOfClaims = benefit.maxClaims !== null && benefit.claimsThisYear >= benefit.maxClaims;
                        return (
                            <li key={benefit.code} className="flex flex-col overflow-hidden rounded-lg border border-line bg-white">
                                <BenefitThumb category={benefit.category} className="h-[140px]" />
                                <div className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
                                    <p className="text-12 text-muted">
                                        {benefit.code} · {benefit.category}
                                    </p>
                                    <h2 className="text-16 font-semibold">{benefit.name}</h2>
                                    {benefit.description ? <p className="text-13 text-ink-soft">{benefit.description}</p> : null}
                                    <div className="mt-auto flex justify-between gap-3 pt-1.5 text-12 text-muted">
                                        <span>{benefit.maxClaims !== null ? `เบิกแล้ว ${benefit.claimsThisYear}/${benefit.maxClaims} ครั้ง` : benefit.maxClaimsNote || 'ไม่จำกัดครั้ง'}</span>
                                        <span className={cx('font-semibold tabular-nums', outOfClaims ? 'text-status-pending-ink' : 'text-ink')}>
                                            {outOfClaims ? 'ครบจำนวนครั้งแล้ว' : `คงเหลือ ${baht(benefit.remaining)}`}
                                        </span>
                                    </div>
                                    <UsageBar used={benefit.used} pending={benefit.pending} limit={benefit.limit} />
                                    <p className="text-12 text-muted">
                                        วงเงิน {baht(benefit.limit)} ต่อ{benefit.budgetLabel}
                                    </p>
                                    <Link href={`/employee/welfare/${encodeURIComponent(benefit.code)}`} aria-label={`ดูรายละเอียด ${benefit.name}`} className={cx(pill.outline, 'mt-1.5')}>
                                        ดูรายละเอียด
                                    </Link>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </>
    );
}
