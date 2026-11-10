'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { FilterChips } from '@/components/ui/FilterChips';
import { SearchInput } from '@/components/ui/SearchInput';
import { Tag } from '@/components/ui/Tag';
import type { EmployeeBenefit } from '@/lib/claims/types';

const ALL = 'ทั้งหมด';
const number = new Intl.NumberFormat('th-TH');

export default function WelfareClient({ benefits }: { benefits: EmployeeBenefit[] }) {
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState(ALL);

    const categories = [...new Set(benefits.map((benefit) => benefit.category))];
    const q = query.trim().toLowerCase();
    const matchesQuery = (benefit: EmployeeBenefit) =>
        !q || `${benefit.name} ${benefit.code} ${benefit.category} ${benefit.description ?? ''}`.toLowerCase().includes(q);
    // จำนวนบนแต่ละหมวดนับตามคำค้นปัจจุบัน จะได้รู้ว่าผลค้นหาอยู่หมวดไหน
    const searched = benefits.filter(matchesQuery);
    const shown = searched.filter((benefit) => category === ALL || benefit.category === category);

    return (
        <div className="mx-auto max-w-[1280px] space-y-4 px-1 py-3 text-ink">
            <div>
                <h1 className="text-22 font-semibold">สิทธิ์สวัสดิการ</h1>
                <p className="mt-1 text-12 text-muted">
                    สิทธิ์ที่คุณใช้ได้ {benefits.length} รายการ ประจำปี {new Date().getFullYear() + 543} เปิดดูรายละเอียดเพื่อตรวจเงื่อนไขและหลักฐานก่อนยื่นเบิก
                </p>
            </div>

            <SearchInput label="ค้นหาสวัสดิการ" placeholder="ค้นหาชื่อสวัสดิการ หรือหมวด" value={query} onChange={setQuery} className="md:max-w-[480px]" />

            <FilterChips
                label="กรองตามหมวด"
                value={category}
                onChange={setCategory}
                options={[
                    { id: ALL, label: ALL, count: searched.length },
                    ...categories.map((name) => ({ id: name, label: name, count: searched.filter((benefit) => benefit.category === name).length })),
                ]}
            />

            {shown.length === 0 ? (
                <div className="rounded-lg border border-line bg-white px-4 py-10 text-center text-13 text-muted">
                    <p>{benefits.length === 0 ? 'ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้ในขณะนี้' : 'ไม่พบสวัสดิการที่ตรงกับการค้นหา'}</p>
                    {benefits.length > 0 ? (
                        <button
                            type="button"
                            onClick={() => {
                                setQuery('');
                                setCategory(ALL);
                            }}
                            className="mt-2 text-primary-700 underline-offset-4 hover:underline"
                        >
                            ล้างการค้นหา
                        </button>
                    ) : null}
                </div>
            ) : (
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {shown.map((benefit) => (
                        <li key={benefit.code} className="flex flex-col rounded-lg border border-line bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-12 text-muted">{benefit.category}</p>
                                    <h2 className="mt-1 text-15 font-semibold text-ink">{benefit.name}</h2>
                                </div>
                                <Tag tone={benefit.remaining > 0 ? 'success' : 'neutral'}>{benefit.remaining > 0 ? 'ใช้สิทธิ์ได้' : 'ใช้สิทธิ์ครบแล้ว'}</Tag>
                            </div>
                            {benefit.description ? <p className="mt-2 text-13 leading-5 text-muted">{benefit.description}</p> : null}

                            <dl className="mt-auto grid grid-cols-2 gap-3 pt-4 text-13">
                                <div>
                                    <dt className="text-12 text-muted">วงเงินต่อ{benefit.budgetLabel}</dt>
                                    <dd className="mt-1 font-semibold tabular-nums">{number.format(benefit.limit)} บาท</dd>
                                </div>
                                <div className="text-right">
                                    <dt className="text-12 text-muted">คงเหลือ</dt>
                                    <dd className="mt-1 font-semibold tabular-nums text-primary-700">{number.format(benefit.remaining)} บาท</dd>
                                </div>
                            </dl>

                            <Link
                                href={`/employee/welfare/${encodeURIComponent(benefit.code)}`}
                                aria-label={`ดูรายละเอียด ${benefit.name}`}
                                className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary-50 text-13 font-medium text-primary-700 transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                            >
                                ดูรายละเอียด
                                <ArrowRight className="size-3.5" aria-hidden="true" />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
