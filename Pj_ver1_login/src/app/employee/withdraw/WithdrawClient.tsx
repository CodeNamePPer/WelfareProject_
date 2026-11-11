'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState } from 'react';
import { ALLOWED_ATTACHMENT_TYPES, APPROVAL_FLOW, MAX_ATTACHMENT_BYTES, fieldsFor, toClaimPayload } from '@/lib/claims/forms';
import type { EmployeeBenefit } from '@/lib/claims/types';
import { ATTACHMENT_RULE, RequiredDocuments } from '@/features/welfare/RequiredDocuments';

const steps = [
    { label: 'กรอกข้อมูล', active: 'กรอกข้อมูลและแนบเอกสาร' },
    { label: 'ยืนยัน', active: 'ตรวจสอบและส่ง' },
];

export type WithdrawInitial = {
    claimNo: string;
    benefitCode: string;
    values: Record<string, string>;
    note: string;
    receiptNo: string;
    receiptDate: string;
    attachments: string[];
    revisionNote: string | null;
};

const money = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const inputClass = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

export default function WithdrawClient({
    applicant,
    benefits,
    initial,
    initialBenefitCode,
}: {
    applicant: { employeeId: string; fullName: string; department: string };
    benefits: EmployeeBenefit[];
    initial: WithdrawInitial | null;
    initialBenefitCode: string | null;
}) {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [claimNo, setClaimNo] = useState(initial?.claimNo ?? '');
    const [benefitCode, setBenefitCode] = useState(
        initial?.benefitCode ?? benefits.find((item) => item.code === initialBenefitCode)?.code ?? benefits[0]?.code ?? '',
    );
    const [values, setValues] = useState<Record<string, string>>(initial?.values ?? {});
    const [note, setNote] = useState(initial?.note ?? '');
    const [receiptNo, setReceiptNo] = useState(initial?.receiptNo ?? '');
    const [receiptDate, setReceiptDate] = useState(initial?.receiptDate ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const benefit = benefits.find((item) => item.code === benefitCode);
    const fields = fieldsFor(benefit?.formType);
    const amount = Number(values.amount) || 0;
    const overLimit = Boolean(benefit) && amount > (benefit?.remaining ?? 0);
    // คำขอที่ส่งกลับมาแก้ไขถูกนับอยู่แล้ว จึงไม่กันซ้ำที่หน้าจอ ฐานข้อมูลตรวจอีกชั้นตอนส่ง
    const claimsLeft = benefit && benefit.maxClaims !== null ? Math.max(benefit.maxClaims - benefit.claimsThisYear, 0) : null;
    const outOfClaims = claimsLeft === 0 && !initial;

    const summaryItems = useMemo(() => {
        if (!benefit) return [];
        return [
            { label: 'สิทธิ์สวัสดิการ', value: benefit.name },
            { label: `วงเงินต่อ${benefit.budgetLabel}`, value: `${money(benefit.limit)} บาท` },
            { label: 'ใช้ไปแล้ว', value: `${money(benefit.used)} บาท` },
            { label: 'รอตรวจสอบ', value: `${money(benefit.pending)} บาท` },
            { label: 'คงเหลือ', value: `${money(benefit.remaining)} บาท` },
            { label: 'เบิกครั้งนี้', value: `${money(amount)} บาท` },
            { label: 'คงเหลือหลังเบิก', value: `${money(Math.max(benefit.remaining - amount, 0))} บาท` },
        ];
    }, [amount, benefit]);

    const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

    function addFiles(selected: FileList | null) {
        const list = Array.from(selected ?? []);
        const bad = list.find((file) => !ALLOWED_ATTACHMENT_TYPES.includes(file.type) || file.size > MAX_ATTACHMENT_BYTES);
        if (bad) setError(`ไฟล์ ${bad.name} ต้องเป็น PDF, JPG หรือ PNG และมีขนาดไม่เกิน 10 MB`);
        else setError('');
        setFiles((current) => [...current, ...list.filter((file) => file !== bad)]);
        if (fileInput.current) fileInput.current.value = '';
    }

    function validateFields() {
        const missing = fields.some((field) => !field.optional && !values[field.key]?.trim());
        if (outOfClaims) return `เบิกสวัสดิการนี้ครบ ${benefit?.maxClaims} ครั้งของปีนี้แล้ว`;
        if (missing || amount <= 0) return 'กรุณากรอกข้อมูลให้ครบถ้วน';
        if (benefit && amount > benefit.remaining) return `ยอดเบิกเกินวงเงินคงเหลือ ${money(benefit.remaining)} บาท`;
        return '';
    }

    async function send(submit: boolean) {
        if (!benefit || busy) return;
        const payload = toClaimPayload(benefit.formType, values);
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const body = new FormData();
            body.append('payload', JSON.stringify({ ...payload, claimNo, benefitCode: benefit.code, note, receiptNo, receiptDate, submit }));
            files.forEach((file) => body.append('files', file));
            const response = await fetch('/api/claims', { method: 'POST', body });
            const data = await response.json();
            if (data.claimNo) setClaimNo(data.claimNo);
            if (!response.ok) {
                if (data.claimNo) setFiles([]);
                setError(data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                return;
            }
            if (submit) {
                router.push('/employee/status');
                router.refresh();
                return;
            }
            setFiles([]);
            setNotice(`บันทึกฉบับร่าง ${data.claimNo} แล้ว`);
        } catch {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setBusy(false);
        }
    }

    function next() {
        if (currentStep === 0) {
            const problem = validateFields();
            if (problem) return setError(problem);
            setError('');
            setCurrentStep(1);
            return;
        }
        if (!receiptNo.trim() || !receiptDate) return setError('กรุณาระบุเลขที่และวันที่ในใบเสร็จ');
        if (files.length + (initial?.attachments.length ?? 0) === 0) return setError('กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์');
        if (!agreed) return setError('กรุณายืนยันความถูกต้องของข้อมูลก่อนส่งคำขอ');
        void send(true);
    }

    if (benefits.length === 0) {
        return <p className="px-4 py-5 text-13 text-muted">ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้ในขณะนี้</p>;
    }

    return (
        <div className="mx-auto max-w-[1250px] px-4 py-5 text-ink">
            <div className="mb-4">
                <h1 className="text-22 font-semibold tracking-[-0.04em] text-ink">ยื่นคำขอสวัสดิการ</h1>
                <p className="mt-1 text-13 text-muted">แบบฟอร์มยื่นคำขอเบิกสวัสดิการตามสิทธิ์ของคุณ{claimNo ? ` · ${claimNo}` : ''}</p>
            </div>

            {initial?.revisionNote ? (
                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-13 text-amber-800">สิ่งที่ต้องแก้ไข: {initial.revisionNote}</p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-4 py-3 text-13">
                    {steps.map((step, index) => {
                        const isActive = index === currentStep;
                        const isComplete = index < currentStep;
                        return (
                            <div key={step.label} className="flex items-center gap-2">
                                <div className={[
                                    'flex h-6 w-6 items-center justify-center rounded-full border text-11 font-semibold',
                                    isComplete
                                        ? 'border-sky-600 bg-sky-600 text-white'
                                        : isActive
                                            ? 'border-sky-600 bg-primary-100 text-primary-600'
                                            : 'border-line bg-white text-muted',
                                ].join(' ')}>
                                    {index + 1}
                                </div>
                                <span className={isActive ? 'font-medium text-ink' : 'text-muted'}>{step.label}</span>
                                {index < steps.length - 1 && <span className="text-muted">›</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_360px]">
                <div className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    {currentStep === 0 && (
                        <>
                            <div className="mb-5">
                                <h2 className="text-18 font-semibold text-ink">1. ข้อมูลผู้ยื่น</h2>
                                <p className="mt-1 text-13 text-muted">ข้อมูลส่วนบุคคล และสิทธิ์ที่สามารถเบิกได้</p>
                            </div>

                            <div className="space-y-5">
                                <div className="rounded-xl border border-line bg-surface p-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <p className="mb-2 block text-13 font-medium text-ink-soft">รหัสพนักงาน</p>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">{applicant.employeeId}</div>
                                        </div>
                                        <div>
                                            <p className="mb-2 block text-13 font-medium text-ink-soft">สังกัด</p>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">{applicant.department}</div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <p className="mb-2 block text-13 font-medium text-ink-soft">ชื่อ-นามสกุล</p>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">{applicant.fullName}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-line bg-surface p-4">
                                    <div className="mb-4">
                                        <h3 className="text-18 font-semibold text-ink">2. ข้อมูลคำขอและค่าใช้จ่าย</h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="benefit" className="mb-2 block text-13 font-medium text-ink-soft">สิทธิ์สวัสดิการ</label>
                                            <select
                                                id="benefit"
                                                value={benefitCode}
                                                onChange={(e) => {
                                                    setBenefitCode(e.target.value);
                                                    setValues({});
                                                    setError('');
                                                }}
                                                className={inputClass}
                                            >
                                                {benefits.map((option) => (
                                                    <option key={option.code} value={option.code}>{option.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {benefit ? (
                                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-12 leading-5">
                                                <dt className="text-muted">ผู้มีสิทธิ์</dt>
                                                <dd className="text-ink-soft">{benefit.eligibilityNote || 'พนักงานทุกคน'}</dd>
                                                <dt className="text-muted">จำนวนครั้ง</dt>
                                                <dd className={outOfClaims ? 'text-status-rejected' : 'text-ink-soft'}>
                                                    {benefit.maxClaims !== null
                                                        ? `${benefit.maxClaims} ครั้ง/ปี · ปีนี้ใช้ไป ${benefit.claimsThisYear} ครั้ง เหลือ ${claimsLeft} ครั้ง`
                                                        : benefit.maxClaimsNote || 'ไม่จำกัดจำนวนครั้ง'}
                                                </dd>
                                                <dt className="text-muted">ขั้นตอนอนุมัติ</dt>
                                                <dd className="text-ink-soft">{APPROVAL_FLOW}</dd>
                                            </dl>
                                        ) : null}

                                        {benefit ? (
                                            <div className="rounded-lg border border-line bg-white p-4">
                                                <p className="text-13 font-medium text-ink">เอกสารที่ต้องเตรียม</p>
                                                <p className="mb-2 mt-0.5 text-12 text-muted">แนบในขั้นตอนถัดไป {ATTACHMENT_RULE}</p>
                                                <RequiredDocuments documents={benefit.documents} />
                                            </div>
                                        ) : null}

                                        {fields.map((field) => {
                                            const value = values[field.key] ?? '';
                                            return (
                                                <div key={field.key}>
                                                    <label htmlFor={field.key} className="mb-2 block text-13 font-medium text-ink-soft">{field.label}</label>
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            id={field.key}
                                                            value={value}
                                                            onChange={(e) => setValue(field.key, e.target.value)}
                                                            rows={3}
                                                            placeholder={field.placeholder}
                                                            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                                        />
                                                    ) : field.type === 'select' ? (
                                                        <select id={field.key} value={value} onChange={(e) => setValue(field.key, e.target.value)} className={inputClass}>
                                                            <option value="">เลือก</option>
                                                            {field.options?.map((option) => <option key={option}>{option}</option>)}
                                                        </select>
                                                    ) : field.key === 'amount' ? (
                                                        <>
                                                            <div className="relative">
                                                                <input
                                                                    id={field.key}
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    min={0}
                                                                    max={benefit?.remaining}
                                                                    step="0.01"
                                                                    value={value}
                                                                    onChange={(e) => setValue(field.key, e.target.value)}
                                                                    placeholder="0.00"
                                                                    aria-describedby="amount-hint"
                                                                    aria-invalid={overLimit}
                                                                    className={`${inputClass} pr-12 tabular-nums ${overLimit ? 'border-status-rejected focus:border-status-rejected' : ''}`}
                                                                />
                                                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-13 text-muted">บาท</span>
                                                            </div>
                                                            {benefit ? (
                                                                <div id="amount-hint" className="mt-2 space-y-1 text-12 leading-5 text-muted">
                                                                    {overLimit ? (
                                                                        <p role="alert" className="text-status-rejected">ยอดเบิกเกินวงเงินคงเหลือ {money(benefit.remaining)} บาท</p>
                                                                    ) : null}
                                                                    <p>
                                                                        เบิกได้สูงสุด <span className="font-medium text-ink">{money(benefit.remaining)} บาท</span>
                                                                        {' '}(วงเงินคงเหลือต่อ{benefit.budgetLabel})
                                                                    </p>
                                                                    <p>กรอกตามยอดในใบเสร็จ ถ้ายอดในใบเสร็จเกินวงเงินคงเหลือ ให้กรอกเท่าวงเงินคงเหลือ</p>
                                                                </div>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <input
                                                            id={field.key}
                                                            type={field.type}
                                                            min={field.type === 'number' ? 0 : undefined}
                                                            step={field.type === 'number' ? '0.01' : undefined}
                                                            value={value}
                                                            onChange={(e) => setValue(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className={inputClass}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}

                                        <div>
                                            <label htmlFor="note" className="mb-2 block text-13 font-medium text-ink-soft">หมายเหตุ (ถ้ามี)</label>
                                            <textarea
                                                id="note"
                                                value={note}
                                                onChange={(e) => setNote(e.target.value)}
                                                rows={2}
                                                placeholder="กรอกรายละเอียดเพิ่มเติม"
                                                className="w-full rounded-lg border border-line bg-white px-3 py-2 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {currentStep === 1 && (
                        <>
                            <div className="mb-5">
                                <h2 className="text-18 font-semibold text-ink">3. เอกสารและยืนยัน</h2>
                            </div>

                            <div className="mb-4 grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="receiptNo" className="mb-2 block text-13 font-medium text-ink-soft">เลขที่ใบเสร็จ</label>
                                    <input id="receiptNo" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className={inputClass} />
                                </div>
                                <div>
                                    <label htmlFor="receiptDate" className="mb-2 block text-13 font-medium text-ink-soft">วันที่ในใบเสร็จ</label>
                                    <input id="receiptDate" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputClass} />
                                </div>
                            </div>

                            <div className="rounded-xl border border-dashed border-line bg-surface p-4">
                                <div className="mb-3">
                                    <p className="mb-2 text-13 font-medium text-ink">เอกสารที่ต้องแนบสำหรับ{benefit?.name}</p>
                                    <RequiredDocuments documents={benefit?.documents ?? []} />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-ink-soft">PDF</div>
                                        <div>
                                            <div className="text-13 font-medium text-ink">แนบใบเสร็จและเอกสารประกอบ</div>
                                            <div className="text-12 text-muted">PDF, JPG, PNG ขนาดไม่เกิน 10 MB ต่อไฟล์</div>
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => fileInput.current?.click()} className="rounded-lg border border-line bg-white px-3 py-2 text-12 font-medium text-ink-soft hover:bg-surface">อัปโหลด</button>
                                    <input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" aria-label="เลือกไฟล์แนบ" onChange={(e) => addFiles(e.target.files)} />
                                </div>
                                {(initial?.attachments.length ?? 0) + files.length > 0 ? (
                                    <ul className="mt-3 space-y-1 text-12 text-ink-soft">
                                        {initial?.attachments.map((name) => <li key={name}>{name} · แนบไว้แล้ว</li>)}
                                        {files.map((file, index) => (
                                            <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3">
                                                <span>{file.name}</span>
                                                <button type="button" className="text-primary-600 hover:underline" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>นำออก</button>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>

                            <div className="mt-5 rounded-xl border border-line bg-surface p-4 text-13 text-ink-soft">
                                <label className="flex items-start gap-3">
                                    <input type="checkbox" checked={agreed} onChange={() => setAgreed((prev) => !prev)} className="mt-1 h-4 w-4 rounded border-line text-sky-600 focus:ring-sky-500" />
                                    <span>ข้าพเจ้ายืนยันว่าข้อมูลดังกล่าวเป็นความจริงทุกประการ และยินยอมให้บริษัทตรวจสอบข้อมูลตามเงื่อนไขของสวัสดิการ</span>
                                </label>
                            </div>
                        </>
                    )}

                    {error ? <p role="alert" className="mt-4 text-13 text-status-rejected">{error}</p> : null}
                    {notice ? <p role="status" className="mt-4 text-13 text-status-approved-ink">{notice}</p> : null}

                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                        <button
                            type="button"
                            onClick={() => setCurrentStep(0)}
                            disabled={currentStep === 0 || busy}
                            className="rounded-lg border border-line bg-white px-5 py-2.5 text-13 font-medium text-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ย้อนกลับ
                        </button>

                        <div className="flex gap-3">
                            <button type="button" disabled={busy} onClick={() => void send(false)} className="rounded-lg border border-line bg-white px-5 py-2.5 text-13 font-medium text-ink-soft disabled:opacity-40">บันทึกร่าง</button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={next}
                                className="rounded-lg bg-primary-600 px-5 py-2.5 text-13 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                            >
                                {currentStep === 0 ? 'ไปหน้าถัดไป' : busy ? 'กำลังส่ง...' : 'ส่งคำขอ'}
                            </button>
                        </div>
                    </div>
                </div>

                <aside className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="mb-4">
                        <h3 className="text-18 font-semibold text-ink">ตรวจสอบก่อนส่ง</h3>
                    </div>

                    <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-13">
                        <div className="space-y-2">
                            {summaryItems.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 text-13">
                                    <span className="text-muted">{item.label}</span>
                                    <span className="text-right font-medium text-ink">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-line bg-white p-4 text-13 text-ink-soft">
                        <div className="font-medium text-ink">เงื่อนไข</div>
                        <ul className="mt-3 space-y-2">
                            <li>• ต้องแนบเอกสารครบ {(benefit?.documents.length ?? 0) + 1} รายการตามที่ระบุในฟอร์ม</li>
                            <li>• ยอดที่รอตรวจสอบจะถูกกันจากวงเงินคงเหลือทันที</li>
                            <li>• ใบเสร็จใบเดียวกันใช้ยื่นซ้ำไม่ได้</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
