'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CircleAlert, CircleCheck, FileText } from 'lucide-react';
import type { ClaimDbStatus } from '@/lib/claims/types';
import type { Attachment } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { ClaimPill, PageHead, Sheet, inputClass, labelClass, pill } from '@/features/requester/ui';
import type { QueueTab } from '@/features/hr/queue';

type Row = { label: string; value: string; strong?: boolean; wide?: boolean };

export type ReviewData = {
    claimNo: string;
    status: ClaimDbStatus;
    statusLabel: string;
    tab: Exclude<QueueTab, 'all'>;
    title: string;
    subtitle: string;
    person: { name: string; initials: string; position: string; line: string; grid: Row[]; profileHref: string | null };
    proxy: { by: string; reason: string | null } | null;
    entitlement: { title: string; rows: Row[] };
    facts: Row[];
    checks: { ok: boolean; text: string }[];
    blockers: { message: string; action: 'reject' | 'return' | null; reason: string }[];
    attachments: Attachment[];
    amountRequested: number;
    amountApproved: number | null;
    financeNote: string | null;
    payNote: string;
    decided: { actor: string; at: string; note: string | null } | null;
    canDecide: boolean;
    readOnlyReason: string | null;
};

const TAB_LABEL = { pending: 'รอตรวจ', revision: 'ส่งกลับให้แก้ไข', approved: 'อนุมัติแล้ว', rejected: 'ไม่อนุมัติ' } as const;
const DECIDED_LABEL = { approved: 'อนุมัติโดย', rejected: 'ไม่อนุมัติโดย', revision: 'ส่งกลับโดย' } as const;

type Action = 'hr_approve' | 'hr_return' | 'hr_reject';
const DONE: Record<Action, string> = { hr_approve: 'approved', hr_return: 'revision', hr_reject: 'rejected' };

export function ReviewClient({ data }: { data: ReviewData }) {
    const router = useRouter();
    const [doc, setDoc] = useState(0);
    const [amount, setAmount] = useState(String(data.amountRequested));
    const [note, setNote] = useState(() => data.blockers.filter((item) => item.action).map((item) => item.reason).join(' และ '));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<Action | null>(null);

    const approved = Number(amount);
    const adjusted = approved !== data.amountRequested;
    const file = data.attachments[doc];

    async function decide(action: Action) {
        if (busy) return;
        if (action === 'hr_approve') {
            if (!(approved > 0) || approved > data.amountRequested) return setError('ยอดที่อนุมัติต้องมากกว่า 0 และไม่เกินยอดขอเบิก');
            if (adjusted && !note.trim()) return setError('กรุณาระบุเหตุผลที่ปรับยอด ผู้ขอจะเห็นข้อความนี้');
        } else if (!note.trim()) {
            return setError(action === 'hr_return' ? 'กรุณาระบุสิ่งที่ผู้ขอต้องแก้ไข' : 'กรุณาระบุเหตุผลที่ไม่อนุมัติ');
        }
        setBusy(action);
        setError('');
        try {
            const response = await fetch(`/api/claims/${encodeURIComponent(data.claimNo)}/actions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, note: note.trim(), ...(action === 'hr_approve' ? { amountApproved: approved } : {}) }),
            });
            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                setError(body.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                return;
            }
            router.push(`/hr/home?tab=${DONE[action]}`);
            router.refresh();
        } catch {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setBusy(null);
        }
    }

    return (
        <>
            <PageHead
                crumbs={[{ label: 'คิวคำขอ', href: '/hr/home' }, { label: TAB_LABEL[data.tab], href: `/hr/home?tab=${data.tab}` }, { label: data.claimNo }]}
                title={data.tab === 'pending' ? `ตรวจคำขอ ${data.claimNo}` : `คำขอ ${data.claimNo}`}
                description={data.subtitle}
            >
                <ClaimPill status={data.status} />
            </PageHead>

            <div className="flex flex-wrap items-start gap-4">
                {/* ผู้ขอและสิทธิ์ */}
                <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4">
                    <Sheet className="overflow-hidden">
                        <div className="h-14 bg-blue-900" />
                        <div className="px-[18px] pb-4">
                            <span aria-hidden="true" className="-mt-8 flex size-[70px] items-center justify-center rounded-full border-[3px] border-white bg-primary-100 text-[20px] font-semibold text-primary-700">
                                {data.person.initials}
                            </span>
                            <p className="mt-1.5 text-17 font-semibold">{data.person.name}</p>
                            <p className="text-13 text-ink-soft">{data.person.position}</p>
                            <p className="text-12 text-muted">{data.person.line}</p>
                            {data.proxy ? (
                                <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-12 text-amber-800">
                                    ยื่นแทนโดย {data.proxy.by} (หัวหน้าแผนก)
                                    {data.proxy.reason ? <span className="block">เหตุที่ยื่นแทน: {data.proxy.reason}</span> : null}
                                </p>
                            ) : null}
                            <dl className="mt-3 grid grid-cols-2 gap-2.5 border-t border-line pt-3">
                                {data.person.grid.map((row) => (
                                    <div key={row.label}>
                                        <dt className="text-12 text-muted">{row.label}</dt>
                                        <dd className="text-14">{row.value}</dd>
                                    </div>
                                ))}
                            </dl>
                            {data.person.profileHref ? (
                                <Link href={data.person.profileHref} className="mt-3 block text-13 text-primary-600 hover:underline">
                                    ดูโปรไฟล์และประวัติการเบิกทั้งหมด ›
                                </Link>
                            ) : null}
                        </div>
                    </Sheet>
                    <Sheet className="flex flex-col gap-2 px-4 py-3.5 text-13">
                        <p className="font-semibold">{data.entitlement.title}</p>
                        {data.entitlement.rows.map((row) => (
                            <div key={row.label} className="flex justify-between gap-3">
                                <span className="text-muted">{row.label}</span>
                                <span className={cx('text-right', row.strong && 'font-semibold')}>{row.value}</span>
                            </div>
                        ))}
                    </Sheet>
                </div>

                <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
                    {/* รายละเอียดคำขอ */}
                    <Sheet className="p-5">
                        <h2 className="mb-3 text-16 font-semibold">รายละเอียดคำขอ</h2>
                        <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-3">
                            {data.facts.map((row) => (
                                <div key={row.label} className={cx(row.wide && 'sm:col-span-3')}>
                                    <dt className="text-12 text-muted">{row.label}</dt>
                                    <dd className="break-words text-14">{row.strong ? <b className="font-semibold tabular-nums">{row.value}</b> : row.value}</dd>
                                </div>
                            ))}
                        </dl>
                        <ul className="mt-3.5 flex flex-col gap-1.5 text-13">
                            {data.checks.map((check) => (
                                <li key={check.text} className="flex items-center gap-2">
                                    {check.ok ? (
                                        <CircleCheck className="size-4 shrink-0 text-status-approved" aria-label="ผ่าน" />
                                    ) : (
                                        <CircleAlert className="size-4 shrink-0 text-status-rejected" aria-label="ต้องตรวจ" />
                                    )}
                                    {check.text}
                                </li>
                            ))}
                        </ul>
                        {data.financeNote ? <p className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-13 text-indigo-900">การเงินส่งกลับ: {data.financeNote}</p> : null}
                    </Sheet>

                    {/* เอกสารแนบ */}
                    <Sheet className="p-5">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="text-16 font-semibold">เอกสารแนบ</h2>
                            {data.attachments.length > 1 ? (
                                <div role="group" aria-label="เลือกเอกสาร" className="flex flex-wrap gap-1.5">
                                    {data.attachments.map((item, index) => (
                                        <button
                                            key={item.src}
                                            type="button"
                                            aria-pressed={index === doc}
                                            onClick={() => setDoc(index)}
                                            className={cx('h-8 max-w-[200px] truncate rounded-lg px-3 text-13', index === doc ? 'border-[1.5px] border-primary-600 bg-primary-50 text-primary-700' : 'border border-line bg-white')}
                                        >
                                            {item.name}
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                        {file ? (
                            <div className="flex h-[320px] items-center justify-center overflow-auto rounded-lg bg-[#EEF1F5] p-5">
                                {file.isImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={file.src} alt={file.name} className="max-h-full max-w-full bg-white object-contain shadow-sm" />
                                ) : (
                                    <a href={file.src} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 text-13 text-primary-700 hover:underline">
                                        <FileText className="size-10" strokeWidth={1.5} aria-hidden="true" />
                                        {file.name} · {file.size}
                                        <span className="text-12 text-muted">เปิดในแท็บใหม่</span>
                                    </a>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg bg-surface px-4 py-8 text-center text-13 text-muted">ผู้ขอไม่ได้แนบเอกสาร</p>
                        )}
                        {file?.isImage ? (
                            <a href={file.src} target="_blank" rel="noreferrer" className="mt-2 inline-block text-12 text-primary-600 hover:underline">
                                เปิด {file.name} ในแท็บใหม่
                            </a>
                        ) : null}
                    </Sheet>

                    {/* ผลการตรวจ */}
                    <Sheet className="flex flex-col gap-3 p-5">
                        <h2 className="text-16 font-semibold">ผลการตรวจ</h2>
                        {data.tab !== 'pending' ? (
                            <div className="flex flex-col gap-1 text-13">
                                <p>
                                    {data.statusLabel}
                                    {data.amountApproved !== null ? (
                                        <>
                                            {' '}
                                            · ยอดอนุมัติ <b className="font-semibold tabular-nums">{baht(data.amountApproved)}</b>
                                        </>
                                    ) : null}
                                </p>
                                {data.decided ? (
                                    <p className="text-muted">
                                        {DECIDED_LABEL[data.tab]} {data.decided.actor} · {data.decided.at}
                                    </p>
                                ) : null}
                                {data.decided?.note ? <p className="rounded-lg bg-surface px-3 py-2">&ldquo;{data.decided.note}&rdquo;</p> : null}
                            </div>
                        ) : data.canDecide ? (
                            <>
                                {data.blockers.length > 0 ? (
                                    <ul className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-13 text-red-900">
                                        {data.blockers.map((item) => (
                                            <li key={item.message}>• {item.message}</li>
                                        ))}
                                    </ul>
                                ) : null}
                                <div>
                                    <label htmlFor="approve-amount" className={labelClass}>
                                        ยอดที่อนุมัติ (บาท) · ปรับลดได้
                                    </label>
                                    <input
                                        id="approve-amount"
                                        type="number"
                                        inputMode="decimal"
                                        min={0}
                                        max={data.amountRequested}
                                        step="0.01"
                                        value={amount}
                                        onChange={(event) => setAmount(event.target.value)}
                                        className={cx(inputClass, 'max-w-[240px] text-right tabular-nums')}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="review-note" className={labelClass}>
                                        เหตุผล / ข้อความถึงผู้ขอ (บังคับเมื่อปรับยอด ส่งกลับ หรือไม่อนุมัติ)
                                    </label>
                                    <textarea id="review-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={cx(inputClass, '!h-auto py-2.5')} />
                                </div>
                                {error ? (
                                    <p role="alert" className="text-13 text-status-rejected">
                                        {error}
                                    </p>
                                ) : null}
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" disabled={busy !== null} onClick={() => void decide('hr_approve')} className={pill.primary}>
                                        {busy === 'hr_approve' ? 'กำลังบันทึก...' : 'อนุมัติ'}
                                    </button>
                                    <button
                                        type="button"
                                        disabled={busy !== null}
                                        onClick={() => void decide('hr_return')}
                                        aria-label="ส่งกลับให้ผู้ขอแก้ไข"
                                        className={cx(pill.primary, '!bg-[#FF8A00] hover:!bg-[#E67A00]')}
                                    >
                                        {busy === 'hr_return' ? 'กำลังบันทึก...' : 'แก้ไข'}
                                    </button>
                                    <button type="button" disabled={busy !== null} onClick={() => void decide('hr_reject')} className={cx(pill.primary, '!bg-red-800 hover:!bg-red-900')}>
                                        {busy === 'hr_reject' ? 'กำลังบันทึก...' : 'ไม่อนุมัติ'}
                                    </button>
                                </div>
                                <p className="text-12 text-muted">ปรับยอดได้เฉพาะ HR ผู้ขอจะเห็นยอดใหม่พร้อมเหตุผล การเงินปรับไม่ได้ · {data.payNote}</p>
                            </>
                        ) : (
                            <p className="rounded-lg bg-surface px-3 py-2.5 text-13 text-muted">{data.readOnlyReason}</p>
                        )}
                    </Sheet>
                </div>
            </div>
        </>
    );
}
