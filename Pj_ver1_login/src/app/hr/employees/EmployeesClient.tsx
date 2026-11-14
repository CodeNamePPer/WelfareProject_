'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { EmptyNote, PageHead, Pill, RowLink, Sheet, inputClass, pill } from '@/features/requester/ui';

export type EmployeeRow = {
    code: string;
    name: string;
    initials: string;
    /** รหัส · ตำแหน่ง · แผนก */
    line: string;
    department: string;
    position: string;
    level: string;
    manager: string | null;
    /** จำนวนคำขอที่ยื่นปีนี้ (null = โหลดคำขอไม่สำเร็จ) */
    claims: number | null;
    active: boolean;
    statusLabel: string;
};

type Tab = 'active' | 'left' | 'edits';

const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_140px_110px_120px]';
const ALL = '';
const filterClass = 'h-9 rounded-full border border-slate-300 bg-white px-4 text-13 text-ink-soft';
const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'th'));

export function EmployeesClient({ rows, initialQuery }: { rows: EmployeeRow[]; initialQuery: string }) {
    const [tab, setTab] = useState<Tab>('active');
    const [query, setQuery] = useState(initialQuery);
    const [department, setDepartment] = useState(ALL);
    const [position, setPosition] = useState(ALL);
    const [level, setLevel] = useState(ALL);

    const activeCount = rows.filter((row) => row.active).length;
    const q = query.trim().toLowerCase();
    const shown = rows.filter(
        (row) =>
            (tab === 'active' ? row.active : !row.active) &&
            (!q || `${row.name} ${row.code}`.toLowerCase().includes(q)) &&
            (!department || row.department === department) &&
            (!position || row.position === position) &&
            (!level || row.level === level),
    );
    const tabs: { id: Tab; label: string }[] = [
        { id: 'active', label: `ทำงานอยู่ (${activeCount})` },
        { id: 'left', label: `พ้นสภาพ (${rows.length - activeCount})` },
        { id: 'edits', label: 'คำขอแก้ไขข้อมูล' },
    ];

    return (
        <>
            <PageHead title="จัดการพนักงานและสิทธิ์" description={`${rows.length} คน · ทำงานอยู่ ${activeCount} · พ้นสภาพ ${rows.length - activeCount}`}>
                <Link href="/hr/employees/add" className={pill.primary}>
                    เพิ่มพนักงาน
                </Link>
            </PageHead>

            <Sheet>
                <div role="group" aria-label="แท็บ" className="flex flex-wrap border-b border-line px-5">
                    {tabs.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-pressed={item.id === tab}
                            onClick={() => setTab(item.id)}
                            className={cx('mr-[18px] border-b-2 px-1 py-3 text-14', item.id === tab ? 'border-primary-600 font-semibold text-ink' : 'border-transparent text-muted hover:text-ink')}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                {tab === 'edits' ? (
                    // ยังไม่มีตารางคำขอแก้ไขข้อมูลพนักงาน (H12) จึงแสดงสถานะว่างตามที่ตกลงไว้
                    <EmptyNote>ยังไม่เปิดให้พนักงานส่งคำขอแก้ไขข้อมูลในระบบ ตอนนี้ HR แก้ข้อมูลได้โดยตรงจากหน้าโปรไฟล์พนักงาน</EmptyNote>
                ) : (
                    <>
                        <div className="flex flex-wrap gap-2 px-5 py-3">
                            <input
                                type="search"
                                aria-label="ค้นหาพนักงาน"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="ค้นหาชื่อ รหัส"
                                className={cx(inputClass, '!h-9 !w-[260px] max-w-full')}
                            />
                            <select aria-label="แผนก" value={department} onChange={(event) => setDepartment(event.target.value)} className={filterClass}>
                                <option value={ALL}>แผนก ทั้งหมด</option>
                                {unique(rows.map((row) => row.department)).map((name) => (
                                    <option key={name}>{name}</option>
                                ))}
                            </select>
                            <select aria-label="ตำแหน่ง" value={position} onChange={(event) => setPosition(event.target.value)} className={filterClass}>
                                <option value={ALL}>ตำแหน่ง ทั้งหมด</option>
                                {unique(rows.map((row) => row.position)).map((name) => (
                                    <option key={name}>{name}</option>
                                ))}
                            </select>
                            <select aria-label="ระดับ" value={level} onChange={(event) => setLevel(event.target.value)} className={filterClass}>
                                <option value={ALL}>ระดับ ทั้งหมด</option>
                                {unique(rows.map((row) => row.level)).map((name) => (
                                    <option key={name}>{name}</option>
                                ))}
                            </select>
                        </div>
                        {shown.length === 0 ? (
                            <EmptyNote>{q || department || position || level ? 'ไม่พบพนักงานที่ตรงกับตัวกรอง' : tab === 'active' ? 'ยังไม่มีพนักงานที่ทำงานอยู่' : 'ยังไม่มีพนักงานที่พ้นสภาพ'}</EmptyNote>
                        ) : (
                            <div className="overflow-x-auto">
                                <div className="min-w-[860px]">
                                    <div className={`grid ${COLS} gap-3.5 bg-surface px-5 py-2 text-12 font-medium text-muted`}>
                                        <span>พนักงาน</span>
                                        <span>ระดับ / หัวหน้า</span>
                                        <span>เบิกปีนี้</span>
                                        <span>สถานะ</span>
                                        <span />
                                    </div>
                                    {shown.map((row) => (
                                        <RowLink key={row.code} href={`/hr/employees/${encodeURIComponent(row.code)}`} className={cx(COLS, 'gap-3.5 py-3')}>
                                            <span className="flex min-w-0 items-center gap-2.5">
                                                <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-13 font-semibold text-ink-soft">
                                                    {row.initials}
                                                </span>
                                                <span className="min-w-0">
                                                    <span className="block font-semibold">{row.name}</span>
                                                    <span className="block text-12 text-muted">{row.line}</span>
                                                </span>
                                            </span>
                                            <span className="text-13">
                                                {row.level}
                                                <span className="block text-muted">หัวหน้า: {row.manager ?? '—'}</span>
                                            </span>
                                            <span className="text-13 tabular-nums">{row.claims === null ? '—' : `${row.claims} ครั้ง`}</span>
                                            <span>
                                                <Pill tone={row.active ? 'green' : 'slate'}>{row.statusLabel}</Pill>
                                            </span>
                                            <span className="text-13 text-primary-600">ดู / แก้ไข ›</span>
                                        </RowLink>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Sheet>
            <p className="text-12 text-muted">พนักงานที่พ้นสภาพ: ยื่นเบิกและยื่นแทนไม่ได้ทุกกรณี</p>
        </>
    );
}
