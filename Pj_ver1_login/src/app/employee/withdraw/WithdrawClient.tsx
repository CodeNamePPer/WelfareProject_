'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Image as ImageIcon, Lock, Upload } from 'lucide-react';
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, fieldsFor, toClaimPayload } from '@/lib/claims/forms';
import type { EmployeeBenefit } from '@/lib/claims/types';
import { baht } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { BenefitPicker, blockedReason, countText } from '@/features/requester/BenefitPicker';
import { PageHead, Sheet, inputClass, labelClass, pill } from '@/features/requester/ui';

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

export type Person = { code: string; fullName: string; department: string; position: string; manager: string };

const PROXY_REASONS = ['ป่วย / พักรักษาตัว', 'ลาคลอด', 'ไปปฏิบัติงานต่างพื้นที่ ใช้ระบบไม่ได้', 'อื่น ๆ (ระบุ)'];

const money = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const baht2 = (value: number) => `฿${money(value)}`;
const lockedClass = 'h-[42px] w-full cursor-not-allowed rounded-lg border border-line bg-slate-100 pr-3 pl-[34px] text-14 text-slate-400 outline-none';
const Required = () => <span className="text-danger"> *</span>;

/** ปุ่มสลับแบบแคปซูล (ยื่นให้ตัวเอง / ยื่นแทน) */
const segment = (active: boolean) =>
    cx('h-8 rounded-full px-3.5 text-13', active ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-muted hover:text-ink');
/** การ์ดตัวเลือก (ประเภทการยื่น) */
const choice = (active: boolean) =>
    cx('rounded-lg px-3.5 py-3 text-left text-14', active ? 'border-[1.5px] border-primary-600 bg-primary-50' : 'border border-slate-300 bg-white');

const firstSelectable = (list: EmployeeBenefit[]) => (list.find((benefit) => !blockedReason(benefit)) ?? list[0])?.code ?? '';

export default function WithdrawClient({
    applicant,
    benefits,
    subordinates,
    benefitsByEmployee,
    initial,
    initialBenefitCode,
    initialProxy,
    expectedPay,
}: {
    applicant: Person;
    benefits: EmployeeBenefit[];
    /** พนักงานในแผนกที่ผู้ใช้เป็นหัวหน้า ว่างเมื่อไม่ใช่หัวหน้าแผนก (ยื่นแทนไม่ได้) */
    subordinates: Person[];
    benefitsByEmployee: Record<string, EmployeeBenefit[]>;
    initial: WithdrawInitial | null;
    initialBenefitCode: string | null;
    initialProxy: boolean;
    /** วันจ่ายของรอบที่คำขอซึ่งยื่นวันนี้ตกอยู่ พร้อมคำอธิบายรอบ */
    expectedPay: { date: string; note: string };
}) {
    const router = useRouter();
    const canProxy = subordinates.length > 0 && !initial;
    const [proxy, setProxy] = useState(canProxy && initialProxy);
    const [targetCode, setTargetCode] = useState(subordinates[0]?.code ?? '');
    const [reason, setReason] = useState(PROXY_REASONS[0]);
    const [reasonNote, setReasonNote] = useState('');

    const person = proxy ? (subordinates.find((item) => item.code === targetCode) ?? subordinates[0]) : applicant;
    const list = proxy ? (benefitsByEmployee[person.code] ?? []) : benefits;

    const [claimNo, setClaimNo] = useState(initial?.claimNo ?? '');
    const [benefitCode, setBenefitCode] = useState(
        initial?.benefitCode ?? (initialProxy && canProxy ? firstSelectable(benefitsByEmployee[subordinates[0].code] ?? []) : undefined) ?? benefits.find((item) => item.code === initialBenefitCode)?.code ?? firstSelectable(benefits),
    );
    const [values, setValues] = useState<Record<string, string>>(initial?.values ?? {});
    const [note, setNote] = useState(initial?.note ?? '');
    const [receiptNo, setReceiptNo] = useState(initial?.receiptNo ?? '');
    const [receiptDate, setReceiptDate] = useState(initial?.receiptDate ?? '');
    const [files, setFiles] = useState<File[]>([]);
    const [dragging, setDragging] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const benefit = list.find((item) => item.code === benefitCode);
    const fields = fieldsFor(benefit?.formType);
    const amountField = fields.find((field) => field.key === 'amount');
    const detailFields = fields.filter((field) => field.key !== 'amount');
    const amount = Number(values.amount) || 0;
    const overLimit = Boolean(benefit) && amount > (benefit?.remaining ?? 0);
    // คำขอที่ส่งกลับมาแก้ไขถูกนับอยู่แล้ว จึงไม่กันซ้ำที่หน้าจอ ฐานข้อมูลตรวจอีกชั้นตอนส่ง
    const outOfClaims = Boolean(benefit) && benefit!.maxClaims !== null && benefit!.claimsThisYear >= benefit!.maxClaims! && !initial;
    const revising = Boolean(initial?.revisionNote);
    const firstName = person.fullName.replace(/^(นาย|นางสาว|นาง|น\.ส\.)/, '').split(' ')[0];

    const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

    function switchPerson(nextProxy: boolean, code = targetCode) {
        const nextList = nextProxy ? (benefitsByEmployee[code] ?? []) : benefits;
        setProxy(nextProxy);
        setTargetCode(code);
        setBenefitCode(firstSelectable(nextList));
        setValues({});
        setClaimNo('');
        setError('');
        setNotice('');
    }

    function addFiles(selected: FileList | null) {
        const picked = Array.from(selected ?? []);
        const bad = picked.find((file) => !ALLOWED_ATTACHMENT_TYPES.includes(file.type) || file.size > MAX_ATTACHMENT_BYTES);
        setError(bad ? `ไฟล์ ${bad.name} ต้องเป็น PDF, JPG หรือ PNG และมีขนาดไม่เกิน 10 MB` : '');
        setFiles((current) => [...current, ...picked.filter((file) => file !== bad)]);
        if (fileInput.current) fileInput.current.value = '';
    }

    function validateFields() {
        if (proxy && !reasonNote.trim()) return 'กรุณาระบุรายละเอียดเหตุที่พนักงานยื่นเองไม่ได้';
        if (outOfClaims) return `เบิกสวัสดิการนี้ครบ ${benefit?.maxClaims} ครั้งของปีนี้แล้ว`;
        const missing = fields.some((field) => !field.optional && !values[field.key]?.trim());
        if (missing || amount <= 0) return 'กรุณากรอกข้อมูลให้ครบถ้วน';
        if (benefit && amount > benefit.remaining) return `ยอดเบิกเกินวงเงินคงเหลือ ${money(benefit.remaining)} บาท`;
        return '';
    }

    async function send(submit: boolean) {
        if (!benefit || busy) return;
        const payload = toClaimPayload(benefit.formType, values);
        // ตารางคำขอยังไม่มีช่องเหตุผลการยื่นแทน จึงเก็บไว้ต้นหมายเหตุให้ HR เห็น
        const fullNote = proxy ? [`ยื่นแทนเพราะ ${reason}: ${reasonNote.trim()}`, note.trim()].filter(Boolean).join(' · ') : note;
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const body = new FormData();
            body.append(
                'payload',
                JSON.stringify({ ...payload, claimNo, ...(proxy ? { employeeCode: person.code } : {}), benefitCode: benefit.code, note: fullNote, receiptNo, receiptDate, submit }),
            );
            files.forEach((file) => body.append('files', file));
            const response = await fetch('/api/claims', { method: 'POST', body });
            const data = await response.json();
            if (data.claimNo) setClaimNo(data.claimNo);
            if (!response.ok) {
                if (data.claimNo) setFiles([]);
                setError(data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                return;
            }
            setFiles([]);
            if (submit && !proxy) {
                router.push('/employee/status');
                router.refresh();
                return;
            }
            if (submit) {
                // คำขอที่ยื่นแทนเป็นของพนักงานคนนั้น จึงไม่อยู่ในรายการของคุณ ล้างฟอร์มไว้ยื่นรายการถัดไป
                setNotice(`ส่งคำขอ ${data.claimNo} แทน ${person.fullName} แล้ว`);
                setClaimNo('');
                setValues({});
                setNote('');
                setReceiptNo('');
                setReceiptDate('');
                setAgreed(false);
                router.refresh();
                return;
            }
            setNotice(`บันทึกฉบับร่าง ${data.claimNo} แล้ว`);
        } catch {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setBusy(false);
        }
    }

    function submit() {
        const problem = validateFields();
        if (problem) return setError(problem);
        if (!receiptNo.trim() || !receiptDate) return setError('กรุณาระบุเลขที่และวันที่ในใบเสร็จ');
        if (files.length + (initial?.attachments.length ?? 0) === 0) return setError('กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์');
        if (!agreed) return setError('กรุณายืนยันความถูกต้องของข้อมูลก่อนส่งคำขอ');
        void send(true);
    }

    if (benefits.length === 0 && !canProxy) {
        return <p className="py-5 text-13 text-muted">ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้ในขณะนี้</p>;
    }

    const personFields = [
        { label: 'ชื่อ-นามสกุล', value: person.fullName },
        { label: 'รหัสพนักงาน', value: person.code },
        { label: 'แผนก', value: person.department },
        { label: 'ตำแหน่ง', value: person.position },
        { label: 'หัวหน้า', value: person.manager },
    ];
    const documents = ['ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน', ...(benefit?.documents ?? [])];
    // ผู้ยื่นคือคนที่กรอกฟอร์มเสมอ ส่วนผู้รับสิทธิ์คือเจ้าของวงเงินที่ถูกหัก (ตัวเอง หรือพนักงานที่ยื่นแทน)
    const remainingAfter = benefit ? Math.max(benefit.remaining - (initial ? 0 : amount), 0) : 0;
    const summary: { label: string; value: string; strong?: boolean; danger?: boolean }[] = [
        { label: 'ผู้ยื่น', value: proxy ? `${applicant.fullName} (หัวหน้าแผนก)` : applicant.fullName },
        { label: 'ผู้รับสิทธิ์', value: proxy ? `${person.fullName} · ${person.code}` : 'ตัวเอง' },
        { label: 'สวัสดิการ', value: benefit?.name ?? '—' },
        { label: 'ประเภท', value: proxy ? 'ยื่นเบิก · ยื่นแทน' : 'ยื่นเบิก' },
        { label: 'ยอดขอเบิก', value: baht2(amount), strong: true },
        ...(benefit
            ? [
                  { label: proxy ? `วงเงินคงเหลือของ${firstName}` : 'วงเงินคงเหลือหลังเบิก', value: overLimit ? 'เกินวงเงิน' : baht2(remainingAfter), danger: overLimit },
                  {
                      label: 'ครั้งที่ใช้หลังยื่น',
                      value: benefit.maxClaims !== null ? `${benefit.claimsThisYear + (initial ? 0 : 1)}/${benefit.maxClaims} ครั้ง` : benefit.maxClaimsNote || 'ไม่จำกัดครั้ง',
                      danger: outOfClaims,
                  },
              ]
            : []),
        ...(proxy ? [{ label: 'โอนเงินเข้า', value: `บัญชีของ${firstName}` }] : []),
    ];

    return (
        <>
            <PageHead
                crumbs={revising ? [{ label: 'ติดตามสถานะ', href: '/employee/status' }, { label: claimNo }] : [{ label: 'ภาพรวม', href: '/employee' }, { label: 'ยื่นคำขอ' }]}
                title={revising ? `แก้ไขคำขอ ${claimNo}` : 'ยื่นคำขอสวัสดิการ'}
                description={revising ? benefit?.name : `กรอกเฉพาะช่องที่มีเครื่องหมาย * ข้อมูลพนักงานดึงจากระบบ HR อัตโนมัติ${claimNo ? ` · ${claimNo}` : ''}`}
            />

            {initial?.revisionNote ? (
                <section aria-label="สิ่งที่ต้องแก้ไข" className="flex flex-col gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-[18px] py-4">
                    <p className="text-13 font-medium text-orange-800">HR ส่งกลับให้แก้ไข</p>
                    <p className="text-14 text-orange-950">&ldquo;{initial.revisionNote}&rdquo;</p>
                    <p className="text-12 text-orange-800">วงเงินยังกันไว้ให้ระหว่างแก้ไข ถ้ายกเลิกคำขอ ระบบคืนวงเงินและจำนวนครั้ง</p>
                </section>
            ) : null}

            <div className="flex flex-wrap items-start gap-4">
                <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
                    {/* 1. ชื่อผู้ส่งคำขอ */}
                    <Sheet aria-labelledby="sec-applicant" className="flex flex-col gap-3.5 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 id="sec-applicant" className="text-16 font-semibold">
                                1. ข้อมูลผู้ส่งคำขอ
                            </h2>
                            {canProxy ? (
                                <div role="group" aria-label="ยื่นให้ใคร" className="flex rounded-full bg-slate-100 p-[3px]">
                                    <button type="button" aria-pressed={!proxy} onClick={() => proxy && switchPerson(false)} className={segment(!proxy)}>
                                        ยื่นให้ตัวเอง
                                    </button>
                                    <button type="button" aria-pressed={proxy} onClick={() => !proxy && switchPerson(true)} className={segment(proxy)}>
                                        ยื่นแทน
                                    </button>
                                </div>
                            ) : null}
                        </div>

                        {proxy ? (
                            <div>
                                <label htmlFor="proxy-employee" className={labelClass}>
                                    พนักงานที่ยื่นแทน
                                    <Required />
                                </label>
                                <select id="proxy-employee" value={targetCode} onChange={(event) => switchPerson(true, event.target.value)} className={cx(inputClass, 'border-blue-300')}>
                                    {subordinates.map((item) => (
                                        <option key={item.code} value={item.code}>
                                            {item.fullName} · {item.code} · {item.position}
                                        </option>
                                    ))}
                                </select>
                                <p className="mt-1.5 text-12 text-muted">หัวหน้าแผนกยื่นแทนได้เฉพาะพนักงานในแผนกของตัวเอง ({subordinates.length} คน)</p>
                                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                                    <div>
                                        <label htmlFor="proxy-reason" className={labelClass}>
                                            เหตุที่พนักงานยื่นเองไม่ได้
                                            <Required />
                                        </label>
                                        <select id="proxy-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass}>
                                            {PROXY_REASONS.map((option) => (
                                                <option key={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="proxy-note" className={labelClass}>
                                            รายละเอียด
                                            <Required />
                                        </label>
                                        <input id="proxy-note" value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} className={inputClass} />
                                    </div>
                                </div>
                                <div className="mt-3 flex flex-col gap-0.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-13 text-amber-800">
                                    <span>• ใช้วงเงินและจำนวนครั้งของพนักงานคนนั้น ไม่ใช่ของคุณ</span>
                                    <span>• เงินโอนเข้าบัญชีของพนักงานโดยตรง</span>
                                    <span>• คำขอบันทึกว่า &ldquo;ยื่นแทนโดย {applicant.fullName}&rdquo;</span>
                                </div>
                            </div>
                        ) : null}

                        <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-3.5">
                            <p className="mb-2.5 flex items-center gap-1.5 text-12 text-slate-400">
                                <Lock className="size-3.5" aria-hidden="true" />
                                ข้อมูลผู้ขอ
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {personFields.map((field) => (
                                    <div key={field.label}>
                                        <p className="mb-1.5 text-13 font-medium text-slate-400">{field.label}</p>
                                        <div className="relative">
                                            <Lock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                                            <input readOnly aria-readonly="true" aria-label={`${field.label} (แก้ไขไม่ได้)`} value={field.value} className={lockedClass} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Sheet>

                    {/* 2. ประเภทการยื่นและสวัสดิการ */}
                    <Sheet aria-labelledby="sec-benefit" className="flex flex-col gap-3.5 p-5">
                        <h2 id="sec-benefit" className="text-16 font-semibold">
                            2. ประเภทการยื่นและสวัสดิการ
                        </h2>
                        <div role="radiogroup" aria-label="ประเภทการยื่น" className="grid grid-cols-2 gap-2.5">
                            <button type="button" role="radio" aria-checked="true" className={choice(true)}>
                                <span className="block font-semibold">ยื่นเบิก</span>
                                <span className="block text-12 text-muted">จ่ายเงินไปแล้ว มีใบเสร็จพร้อมแนบ</span>
                            </button>
                            {/* ระบบยังไม่มีตารางเบิกล่วงหน้า จึงแสดงไว้แต่ยังเลือกไม่ได้ */}
                            <button type="button" role="radio" aria-checked="false" aria-disabled="true" className={cx(choice(false), 'cursor-not-allowed border-dashed bg-surface text-slate-400')}>
                                <span className="block font-semibold">ยื่นล่วงหน้า</span>
                                <span className="block text-12">ยังไม่เปิดให้ยื่นล่วงหน้าในระบบ</span>
                            </button>
                        </div>

                        <p className="-mb-1.5 mt-1 text-13 font-medium text-ink-soft">
                            สวัสดิการ
                            <Required />
                        </p>
                        {benefit ? (
                            <div className="flex flex-wrap items-center gap-3.5 rounded-[10px] border-[1.5px] border-primary-600 bg-primary-50 p-3">
                                <div aria-hidden="true" className="flex h-[72px] w-24 shrink-0 items-center justify-center rounded-lg bg-mist text-muted">
                                    <ImageIcon className="size-6" strokeWidth={1.5} />
                                </div>
                                <div className="min-w-0 flex-[1_1_260px]">
                                    <p className="text-12 text-muted">
                                        {benefit.code} · {benefit.category}
                                    </p>
                                    <p className="text-16 font-semibold">{benefit.name}</p>
                                    <p className={cx('text-13', outOfClaims ? 'text-status-rejected' : 'text-ink-soft')}>
                                        คงเหลือ <b className="font-semibold tabular-nums">{baht(benefit.remaining)}</b>
                                        {proxy ? ` (ของ${firstName})` : ''} · {countText(benefit)}
                                    </p>
                                    <p className="text-12 text-status-approved-ink">เบิกได้เฉพาะตัวเอง</p>
                                </div>
                                {revising ? (
                                    <span className="text-12 text-muted">เปลี่ยนไม่ได้ระหว่างแก้ไข</span>
                                ) : (
                                    <button type="button" aria-haspopup="dialog" onClick={() => setPickerOpen(true)} className={pill.outline}>
                                        เปลี่ยนสวัสดิการ
                                    </button>
                                )}
                            </div>
                        ) : (
                            <p className="rounded-lg bg-surface px-4 py-6 text-center text-13 text-muted">{proxy ? `${person.fullName} ยังไม่มีสวัสดิการที่ใช้สิทธิ์ได้` : 'ยังไม่มีสวัสดิการที่คุณใช้สิทธิ์ได้'}</p>
                        )}
                    </Sheet>

                    {/* 3. รายละเอียดค่าใช้จ่าย */}
                    <Sheet aria-labelledby="sec-expense" className="flex flex-col gap-3.5 p-5">
                        <h2 id="sec-expense" className="text-16 font-semibold">
                            3. รายละเอียดค่าใช้จ่าย
                        </h2>
                        <div className="grid gap-3.5 sm:grid-cols-2">
                            {detailFields.map((field) => {
                                const value = values[field.key] ?? '';
                                const label = (
                                    <label htmlFor={field.key} className={labelClass}>
                                        {field.label}
                                        {field.optional ? null : <Required />}
                                    </label>
                                );
                                if (field.type === 'textarea') {
                                    return (
                                        <div key={field.key} className="sm:col-span-2">
                                            {label}
                                            <textarea id={field.key} value={value} onChange={(e) => setValue(field.key, e.target.value)} rows={3} placeholder={field.placeholder} className={cx(inputClass, '!h-auto py-2')} />
                                        </div>
                                    );
                                }
                                if (field.type === 'select') {
                                    return (
                                        <div key={field.key}>
                                            {label}
                                            <select id={field.key} value={value} onChange={(e) => setValue(field.key, e.target.value)} className={inputClass}>
                                                <option value="">เลือก</option>
                                                {field.options?.map((option) => <option key={option}>{option}</option>)}
                                            </select>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={field.key}>
                                        {label}
                                        <input
                                            id={field.key}
                                            type={field.type}
                                            value={value}
                                            onChange={(e) => setValue(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            className={inputClass}
                                        />
                                    </div>
                                );
                            })}
                            <div>
                                <label htmlFor="receiptNo" className={labelClass}>
                                    เลขที่ใบเสร็จ
                                    <Required />
                                </label>
                                <input id="receiptNo" value={receiptNo} onChange={(e) => setReceiptNo(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="receiptDate" className={labelClass}>
                                    วันที่ในใบเสร็จ
                                    <Required />
                                </label>
                                <input id="receiptDate" type="date" value={receiptDate} onChange={(e) => setReceiptDate(e.target.value)} className={inputClass} />
                            </div>
                        </div>
                        {amountField ? (
                            <div className="sm:max-w-[50%] sm:pr-[7px]">
                                <label htmlFor="amount" className={labelClass}>
                                    {amountField.label} (บาท)
                                    <Required />
                                </label>
                                <input
                                    id="amount"
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={benefit?.remaining}
                                    step="0.01"
                                    value={values.amount ?? ''}
                                    onChange={(e) => setValue('amount', e.target.value)}
                                    placeholder="0.00"
                                    aria-describedby="amount-hint"
                                    aria-invalid={overLimit}
                                    className={cx(inputClass, 'text-right tabular-nums', overLimit && 'border-status-rejected focus:border-status-rejected focus:ring-status-rejected')}
                                />
                                {benefit ? (
                                    <p id="amount-hint" role={overLimit ? 'alert' : undefined} className={cx('mt-1 text-12', overLimit ? 'text-status-rejected' : 'text-muted')}>
                                        {overLimit ? `ยอดเบิกเกินวงเงินคงเหลือ ${money(benefit.remaining)} บาท` : `ไม่เกินวงเงินคงเหลือ ${baht(benefit.remaining)}`}
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
                        <div>
                            <label htmlFor="note" className={labelClass}>
                                หมายเหตุ (ถ้ามี)
                            </label>
                            <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={cx(inputClass, '!h-auto resize-y py-2.5')} />
                        </div>
                    </Sheet>

                    {/* 4. เอกสารแนบ */}
                    <Sheet aria-labelledby="sec-docs" className="flex flex-col gap-3 p-5">
                        <h2 id="sec-docs" className="text-16 font-semibold">
                            4. เอกสารแนบ
                        </h2>
                        <label
                            htmlFor="claim-files"
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);
                                addFiles(event.dataTransfer.files);
                            }}
                            className={cx(
                                'flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-blue-300 p-5 text-13 text-primary-700 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500',
                                dragging ? 'bg-primary-50' : 'bg-[#F8FAFF] hover:bg-primary-50',
                            )}
                        >
                            <Upload className="size-[22px] text-primary-600" aria-hidden="true" />
                            <span className="font-semibold">ลากไฟล์มาวาง หรือกดเพื่อเลือกไฟล์</span>
                            <span className="text-12 text-muted">PDF, JPG, PNG ไม่เกิน 10 MB ต่อไฟล์</span>
                            <input id="claim-files" ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                        </label>
                        {(initial?.attachments.length ?? 0) + files.length > 0 ? (
                            <ul className="flex flex-col gap-1.5 text-13">
                                {initial?.attachments.map((name) => (
                                    <li key={name} className="rounded-lg border border-line px-3 py-2 text-ink-soft">
                                        {name} <span className="text-muted">· แนบไว้แล้ว</span>
                                    </li>
                                ))}
                                {files.map((file, index) => (
                                    <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2">
                                        <span className="min-w-0 truncate">{file.name}</span>
                                        <button type="button" className="shrink-0 text-primary-600 hover:underline" onClick={() => setFiles((current) => current.filter((_, i) => i !== index))}>
                                            นำออก
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        <p className="text-13 text-ink-soft">เอกสารที่ต้องแนบ:</p>
                        <ul className="flex flex-col gap-1.5 text-13">
                            {documents.map((name) => (
                                <li key={name} className="flex items-center gap-2">
                                    <span aria-hidden="true" className="size-4 shrink-0 rounded border-[1.5px] border-slate-300" />
                                    {name}
                                </li>
                            ))}
                        </ul>
                        <label className="mt-1 flex items-start gap-2.5 text-13 text-ink-soft">
                            <input type="checkbox" checked={agreed} onChange={() => setAgreed((prev) => !prev)} className="mt-0.5 size-[18px] shrink-0 accent-primary-600" />
                            <span>ข้าพเจ้ายืนยันว่าข้อมูลถูกต้อง และไม่ได้เบิกค่าใช้จ่ายส่วนเดียวกันจากแหล่งอื่น</span>
                        </label>
                    </Sheet>
                </div>

                <aside aria-label="สรุปคำขอ" className="flex flex-[1_1_300px] flex-col gap-3 lg:sticky lg:top-6">
                    <Sheet className="flex flex-col gap-2.5 px-5 py-[18px]">
                        <h2 className="text-15 font-semibold">{revising ? 'ส่งกลับให้ HR' : 'สรุปคำขอ'}</h2>
                        <dl className="flex flex-col gap-2.5 text-13">
                            {summary.map((item) => (
                                <div key={item.label} className="flex justify-between gap-2">
                                    <dt className="shrink-0 text-muted">{item.label}</dt>
                                    <dd className={cx('text-right', item.strong && 'font-semibold tabular-nums', item.danger && 'text-status-rejected')}>{item.value}</dd>
                                </div>
                            ))}
                        </dl>
                        <div className="border-t border-line pt-2.5 text-13">
                            <p className="text-muted">คาดว่าได้รับเงิน</p>
                            <p className="text-[18px] font-semibold">{expectedPay.date}</p>
                            <p className="text-12 text-muted">{expectedPay.note}</p>
                        </div>
                        {error ? (
                            <p role="alert" className="text-13 text-status-rejected">
                                {error}
                            </p>
                        ) : null}
                        {notice ? (
                            <p role="status" className="text-13 text-status-approved-ink">
                                {notice}
                            </p>
                        ) : null}
                        <button type="button" disabled={busy || !benefit} onClick={submit} className={cx(pill.primary, 'mt-1.5')}>
                            {busy ? 'กำลังส่ง...' : revising ? 'ส่งคำขอที่แก้แล้ว' : 'ส่งคำขอ'}
                        </button>
                        <button type="button" disabled={busy || !benefit} onClick={() => void send(false)} className={pill.quiet}>
                            บันทึกฉบับร่าง
                        </button>
                    </Sheet>
                </aside>
            </div>

            <BenefitPicker
                open={pickerOpen}
                benefits={list}
                selectedCode={benefitCode}
                subtitle={proxy ? `แสดงสิทธิ์และวงเงินของ ${person.fullName}` : 'ค้นหาหรือกรองตามหมวด สวัสดิการที่ใช้ไม่ได้แสดงเป็นสีเทาพร้อมเหตุผล'}
                onPick={(code) => {
                    if (code !== benefitCode) {
                        setBenefitCode(code);
                        setValues({});
                        setError('');
                    }
                    setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
            />
        </>
    );
}
