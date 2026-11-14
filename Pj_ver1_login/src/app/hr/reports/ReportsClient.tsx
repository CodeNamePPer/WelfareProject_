'use client';

import { useState } from 'react';
import type { ClaimDbStatus } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { downloadCsv } from '@/lib/csv';
import { cx } from '@/lib/cx';
import { ExportCsvDialog } from '@/components/ui/ExportCsvDialog';
import { PageHead, Sheet, pill } from '@/features/requester/ui';

export type ReportClaim = {
    claimNo: string;
    employeeCode: string;
    employeeName: string;
    department: string;
    benefit: string;
    status: ClaimDbStatus;
    statusLabel: string;
    amount: number;
    /** วันที่ยื่น YYYY-MM-DD (เวลาไทย) */
    submitted: string;
    /** วันที่โอน YYYY-MM-DD (null = ยังไม่จ่าย) */
    paid: string | null;
};

type Period = 'day' | 'month' | 'year';
const PERIODS: { id: Period; label: string; word: string }[] = [
    { id: 'day', label: 'รายวัน', word: 'วันนี้' },
    { id: 'month', label: 'รายเดือน', word: 'เดือนนี้' },
    { id: 'year', label: 'รายปี', word: 'ปีนี้' },
];

/** สถานะที่ยังไม่จบ แยกตามฝ่ายที่ถือเรื่องอยู่ */
const WAITING_HR: ClaimDbStatus[] = ['pending_hr', 'finance_returned'];
const WAITING_FINANCE: ClaimDbStatus[] = ['pending_finance'];
const WAITING_PAY: ClaimDbStatus[] = ['awaiting_payment'];
const OUTSTANDING = [...WAITING_HR, ...WAITING_FINANCE, ...WAITING_PAY];
/** ยอดเบิกนับเฉพาะคำขอที่ยังมีผล */
const NOT_COUNTED: ClaimDbStatus[] = ['cancelled', 'rejected'];
const CSV_COLUMNS = ['เลขคำขอ', 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'แผนก', 'สวัสดิการ', 'ยอด (บาท)', 'สถานะ', 'วันที่ยื่น', 'วันที่โอน'];

export default function ReportsClient({ claims, today, todayLabel }: { claims: ReportClaim[]; today: string; todayLabel: string }) {
    const [period, setPeriod] = useState<Period>('month');
    const [exporting, setExporting] = useState(false);

    const prefix = period === 'day' ? today : period === 'month' ? today.slice(0, 7) : today.slice(0, 4);
    const year = today.slice(0, 4);
    const word = PERIODS.find((item) => item.id === period)!.word;
    const inPeriod = claims.filter((claim) => claim.submitted.startsWith(prefix));
    const counted = inPeriod.filter((claim) => !NOT_COUNTED.includes(claim.status));
    const outstanding = claims.filter((claim) => OUTSTANDING.includes(claim.status));
    const paidYear = claims.filter((claim) => claim.paid?.startsWith(year));
    const sum = (list: ReportClaim[]) => list.reduce((total, claim) => total + claim.amount, 0);
    const countIn = (statuses: ClaimDbStatus[]) => outstanding.filter((claim) => statuses.includes(claim.status)).length;

    const byBenefit = Object.entries(
        counted.reduce<Record<string, number>>((acc, claim) => ({ ...acc, [claim.benefit]: (acc[claim.benefit] ?? 0) + claim.amount }), {}),
    ).sort((a, b) => b[1] - a[1]);
    const total = sum(counted);
    const top = byBenefit[0]?.[1] ?? 0;
    const byDepartment = Object.entries(
        outstanding.reduce<Record<string, number>>((acc, claim) => ({ ...acc, [claim.department]: (acc[claim.department] ?? 0) + 1 }), {}),
    ).sort((a, b) => b[1] - a[1]);

    const stats = [
        { label: 'รายการคงค้าง', value: String(outstanding.length), note: `รอ HR ${countIn(WAITING_HR)} · รอการเงิน ${countIn(WAITING_FINANCE)} · รอจ่าย ${countIn(WAITING_PAY)}`, warn: outstanding.length > 0 },
        { label: `เบิก${word}`, value: baht(total), note: `${counted.length} คำขอ` },
        { label: 'จ่ายแล้วทั้งปี', value: baht(sum(paidYear)), note: `${paidYear.length} คำขอ` },
        // ยังไม่มีตารางเบิกล่วงหน้า จึงแสดงสถานะว่าง
        { label: 'ค้างใบเสร็จเบิกล่วงหน้า', value: '—', note: 'ยังไม่เปิดเบิกล่วงหน้าในระบบ' },
    ];

    function exportCsv() {
        downloadCsv(
            `welfare-report-${prefix}.csv`,
            CSV_COLUMNS,
            inPeriod.map((claim) => [claim.claimNo, claim.employeeCode, claim.employeeName, claim.department, claim.benefit, claim.amount, claim.statusLabel, claim.submitted, claim.paid ?? '']),
        );
        setExporting(false);
    }

    return (
        <>
            <PageHead title="รายงานและสถิติ" description={`ปีงบ ${Number(year) + 543} · ข้อมูลถึง ${todayLabel}`}>
                <div role="group" aria-label="ช่วงเวลา" className="flex flex-wrap gap-2">
                    {PERIODS.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            aria-pressed={item.id === period}
                            onClick={() => setPeriod(item.id)}
                            className={cx(pill.quiet, item.id === period && '!border-primary-600 !text-primary-700')}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>
                <button type="button" onClick={() => setExporting(true)} disabled={inPeriod.length === 0} className={pill.primary}>
                    Export Excel
                </button>
            </PageHead>

            <div className="flex flex-wrap gap-3">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex-[1_1_180px] rounded-lg border border-line bg-white px-4 py-3.5">
                        <p className="text-12 text-muted">{stat.label}</p>
                        <p className={cx('text-22 font-semibold tabular-nums', stat.warn ? 'text-status-pending-ink' : 'text-ink')}>{stat.value}</p>
                        <p className="text-12 text-muted">{stat.note}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-start gap-4">
                <Sheet className="flex min-w-0 flex-[999_1_520px] flex-col gap-2.5 px-5 py-[18px]">
                    <h2 className="mb-1 text-16 font-semibold">สัดส่วนยอดเบิกตามสวัสดิการ · {word}</h2>
                    {byBenefit.length === 0 ? (
                        <p className="py-6 text-center text-13 text-muted">ยังไม่มีคำขอที่ยื่น{word}</p>
                    ) : (
                        <ul className="flex flex-col gap-2.5 text-13" aria-label="ยอดเบิกตามสวัสดิการ">
                            {byBenefit.map(([name, amount]) => (
                                <li key={name} className="grid grid-cols-[minmax(0,200px)_minmax(0,1fr)_auto] items-center gap-2.5">
                                    <span className="truncate" title={name}>
                                        {name}
                                    </span>
                                    <span aria-hidden="true" className="h-2.5 rounded-[5px] bg-mist">
                                        <span className="block h-2.5 rounded-[5px] bg-primary-600" style={{ width: `${top > 0 ? (amount / top) * 100 : 0}%` }} />
                                    </span>
                                    <span className="w-[120px] text-right tabular-nums">
                                        {Math.round((amount / total) * 100)}% <span className="text-muted">· {baht(amount)}</span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Sheet>
                <Sheet className="flex flex-[1_1_300px] flex-col gap-2 px-5 py-[18px] text-13">
                    <h2 className="mb-1 text-16 font-semibold">คงค้างตามแผนก</h2>
                    {byDepartment.length === 0 ? (
                        <p className="py-4 text-muted">ไม่มีคำขอคงค้าง</p>
                    ) : (
                        byDepartment.map(([name, count]) => (
                            <div key={name} className="flex justify-between gap-3">
                                <span>{name}</span>
                                <b className="font-semibold tabular-nums">{count}</b>
                            </div>
                        ))
                    )}
                </Sheet>
            </div>

            <ExportCsvDialog
                open={exporting}
                rowCount={inPeriod.length}
                unit="คำขอ"
                columns={CSV_COLUMNS}
                personalData="ชื่อและรหัสพนักงาน"
                onConfirm={exportCsv}
                onCancel={() => setExporting(false)}
            />
        </>
    );
}
