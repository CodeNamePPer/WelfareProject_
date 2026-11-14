'use client';

import { useState } from 'react';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { ClaimPill, EmptyNote, PageHead, RowLink, Sheet, inputClass } from '@/features/requester/ui';
import { QUEUE_TABS, type QueueRow, type QueueTab } from '@/features/hr/queue';

const COLS = 'grid-cols-[minmax(0,2.2fr)_minmax(0,1.6fr)_110px_120px_130px]';
const ALL = '';
const filterClass = 'h-9 rounded-full border border-slate-300 bg-white px-4 text-13 text-ink-soft';

type Stat = { label: string; value: string; note: string; warn?: boolean };

export function HrQueueClient({ rows, stats, initialTab }: { rows: QueueRow[]; stats: Stat[]; initialTab: QueueTab }) {
    const [tab, setTab] = useState<QueueTab>(initialTab);
    const [query, setQuery] = useState('');
    const [department, setDepartment] = useState(ALL);
    const [benefit, setBenefit] = useState(ALL);
    const [proxy, setProxy] = useState(ALL);

    const departments = [...new Set(rows.map((row) => row.department))].sort();
    const benefits = [...new Set(rows.map((row) => row.benefitName))].sort();
    const q = query.trim().toLowerCase();
    const filtered = rows.filter(
        (row) =>
            (!q || `${row.employeeName} ${row.employeeCode} ${row.claimNo}`.toLowerCase().includes(q)) &&
            (!department || row.department === department) &&
            (!benefit || row.benefitName === benefit) &&
            (!proxy || (proxy === 'proxy' ? row.proxyBy !== null : row.proxyBy === null)),
    );
    const shown = filtered.filter((row) => tab === 'all' || row.tab === tab);
    const countOf = (id: QueueTab) => (id === 'all' ? null : filtered.filter((row) => row.tab === id).length);

    return (
        <>
            <PageHead title="คิวคำขอสวัสดิการ" description="คำขอสวัสดิการจากทุกแผนกที่ส่งถึง HR · ตัดสินในหน้าตรวจคำขอ" />

            <div className="flex flex-wrap gap-3">
                {stats.map((stat, index) => (
                    <div key={stat.label} className="flex-[1_1_180px] rounded-lg border border-line bg-white px-4 py-3.5">
                        <p className="text-12 text-muted">{stat.label}</p>
                        <p className={cx('text-22 font-semibold tabular-nums', index === 0 && stat.warn && stat.value !== '0' ? 'text-status-pending-ink' : 'text-ink')}>{stat.value}</p>
                        <p className="text-12 text-muted">{stat.note}</p>
                    </div>
                ))}
            </div>

            <Sheet>
                <div role="group" aria-label="แท็บ" className="flex flex-wrap border-b border-line px-5">
                    {QUEUE_TABS.map((item) => {
                        const active = item.id === tab;
                        const count = countOf(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setTab(item.id)}
                                className={cx('mr-[18px] border-b-2 px-1 py-3 text-14', active ? 'border-primary-600 font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}
                            >
                                {item.label}
                                {count !== null ? ` (${count})` : ''}
                            </button>
                        );
                    })}
                </div>
                <div className="flex flex-wrap gap-2 px-5 py-3">
                    <input
                        type="search"
                        aria-label="ค้นหา"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="ค้นหาชื่อ รหัสพนักงาน เลขคำขอ"
                        className={cx(inputClass, '!h-9 !w-[280px] max-w-full')}
                    />
                    <select aria-label="แผนก" value={department} onChange={(event) => setDepartment(event.target.value)} className={filterClass}>
                        <option value={ALL}>แผนก ทั้งหมด</option>
                        {departments.map((name) => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                    <select aria-label="สวัสดิการ" value={benefit} onChange={(event) => setBenefit(event.target.value)} className={filterClass}>
                        <option value={ALL}>สวัสดิการ ทั้งหมด</option>
                        {benefits.map((name) => (
                            <option key={name}>{name}</option>
                        ))}
                    </select>
                    <select aria-label="ยื่นแทน" value={proxy} onChange={(event) => setProxy(event.target.value)} className={filterClass}>
                        <option value={ALL}>ยื่นเองและยื่นแทน</option>
                        <option value="proxy">เฉพาะยื่นแทน</option>
                        <option value="self">เฉพาะยื่นเอง</option>
                    </select>
                </div>

                {shown.length === 0 ? (
                    <EmptyNote>{rows.length === 0 ? 'ยังไม่มีคำขอ' : filtered.length === rows.length ? `ไม่มีคำขอ${QUEUE_TABS.find((item) => item.id === tab)?.label ?? ''}` : 'ไม่มีคำขอในแท็บนี้ที่ตรงกับตัวกรอง'}</EmptyNote>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="min-w-[900px]">
                            <div className={`grid ${COLS} gap-3.5 bg-surface px-5 py-2 text-12 font-medium text-muted`}>
                                <span>ผู้ขอ</span>
                                <span>คำขอ</span>
                                <span className="text-right">จำนวนเงิน</span>
                                <span>สถานะ</span>
                                <span />
                            </div>
                            {shown.map((row) => (
                                <RowLink
                                    key={row.claimNo}
                                    href={`/hr/home/requests/${encodeURIComponent(row.claimNo)}`}
                                    className={cx(COLS, 'gap-3.5 py-3.5', row.action === 'own' && 'bg-surface')}
                                >
                                    <span className="flex min-w-0 items-center gap-2.5">
                                        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-13 font-semibold text-ink-soft">
                                            {row.initials}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block font-semibold">{row.employeeName}</span>
                                            <span className="block text-12 text-muted">{row.role}</span>
                                            {row.proxyBy ? (
                                                <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 text-11 text-amber-800">ยื่นแทนโดย {row.proxyBy} (หัวหน้าแผนก)</span>
                                            ) : null}
                                        </span>
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block font-medium">{row.benefitName}</span>
                                        <span className="block text-12 text-muted">{row.meta}</span>
                                        <span className={cx('block text-12', row.hint.tone === 'amber' ? 'text-amber-800' : 'text-muted')}>{row.hint.text}</span>
                                    </span>
                                    <span className="text-right font-semibold tabular-nums">{baht(row.amount)}</span>
                                    <span>
                                        <ClaimPill status={row.status} />
                                    </span>
                                    <span className="text-right">
                                        {row.action === 'review' ? (
                                            <span className="inline-flex h-8 items-center rounded-full border border-primary-600 bg-white px-3.5 text-13 font-medium text-primary-600">ตรวจคำขอ</span>
                                        ) : (
                                            <span className="text-12 text-muted">{row.action === 'own' ? 'ตรวจไม่ได้ (คำขอของคุณ)' : row.action === 'waiting' ? 'รอผู้ขอ' : 'ดูรายละเอียด ›'}</span>
                                        )}
                                    </span>
                                </RowLink>
                            ))}
                        </div>
                    </div>
                )}
            </Sheet>
        </>
    );
}
