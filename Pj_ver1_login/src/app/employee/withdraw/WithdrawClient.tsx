'use client';

import { useNavTransition } from '@/lib/useNavTransition';
import { useEffect, useRef, useState } from 'react';
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react';
import { ADDRESS_OTHER, ADDRESS_SYSTEM, ALLOWED_ATTACHMENT_TYPES, FLOOD_LEVELS, MAX_ATTACHMENT_BYTES, fieldsFor, fixedAmount, isFieldActive, needsReceipt, toClaimPayload } from '@/lib/claims/forms';
import type { EmployeeBenefit } from '@/lib/claims/types';
import { baht, bangkokToday } from '@/lib/claims/requester';
import { cx } from '@/lib/cx';
import { AdvanceTag, BenefitPicker, blockedReason, countText } from '@/features/requester/BenefitPicker';
import { PageHead, Sheet, inputClass, labelClass, pill } from '@/features/requester/ui';

export type WithdrawInitial = {
    claimNo: string;
    employeeCode?: string;
    benefitCode: string;
    values: Record<string, string>;
    note: string;
    receiptNo: string;
    receiptDate: string;
    /** ไฟล์ที่แนบไว้แล้ว src เปิดผ่าน API ที่ตรวจสิทธิ์ก่อนออกลิงก์ชั่วคราว */
    attachments: { name: string; src: string; isImage: boolean }[];
    revisionNote: string | null;
    /** คำขอนี้ยื่นเป็นเบิกล่วงหน้า */
    isAdvance: boolean;
};

export type Person = { code: string; fullName: string; department: string; position: string; manager: string };

const PROXY_REASONS = ['ป่วย / พักรักษาตัว', 'ลาคลอด', 'ไปปฏิบัติงานต่างพื้นที่ ใช้ระบบไม่ได้', 'อื่น ๆ (ระบุ)'];

const money = (value: number) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const baht2 = (value: number) => `฿${money(value)}`;
const lockedClass = 'h-[42px] w-full cursor-not-allowed rounded-lg border border-line bg-slate-100 px-3 text-14 text-slate-600 outline-none';
const Required = () => <span className="text-danger"> *</span>;

/** ปุ่มสลับแบบแคปซูล (ยื่นให้ตัวเอง / ยื่นแทน) */
const segment = (active: boolean) =>
    cx('h-8 rounded-full px-3.5 text-13', active ? 'bg-white font-semibold text-ink shadow-[0_1px_2px_rgba(15,23,42,.12)]' : 'text-muted hover:text-ink');
/** การ์ดตัวเลือก (ประเภทการยื่น) */
const choice = (active: boolean) =>
    // ขอบหนาเท่ากันทั้งสองสถานะ สลับแล้วกล่องไม่ขยับ
    cx(
        'flex flex-col justify-center rounded-lg border-[1.5px] px-3.5 py-3 text-left text-14 transition-colors',
        active ? 'border-primary-600 bg-primary-50' : 'border-slate-300 bg-white hover:border-slate-400',
    );

const firstSelectable = (list: EmployeeBenefit[]) => (list.find((benefit) => !blockedReason(benefit)) ?? list[0])?.code ?? '';

export default function WithdrawClient({
    applicant,
    benefits,
    subordinates,
    benefitsByEmployee,
    addresses,
    initial,
    initialBenefitCode,
    initialProxy,
    expectedPay,
}: {
    applicant: Person;
    benefits: EmployeeBenefit[];
    /** พนักงานในแผนกที่ผู้ใช้เป็นหัวหน้าแผนก ว่างเมื่อไม่ได้เป็นหัวหน้าแผนก (ยื่นแทนไม่ได้) */
    subordinates: Person[];
    benefitsByEmployee: Record<string, EmployeeBenefit[]>;
    /** ที่อยู่ในระบบของผู้รับสิทธิ์แต่ละคน (รหัสพนักงาน → ที่อยู่) ไม่มีคีย์ = ยังไม่มีที่อยู่ในระบบ */
    addresses: Record<string, string>;
    initial: WithdrawInitial | null;
    initialBenefitCode: string | null;
    initialProxy: boolean;
    /** วันจ่ายของรอบที่คำขอซึ่งยื่นวันนี้ตกอยู่ พร้อมคำอธิบายรอบ */
    expectedPay: { date: string; note: string };
}) {
    const nav = useNavTransition();
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
    const [advanceChoice, setAdvanceChoice] = useState(initial?.isAdvance ?? false);
    const [files, setFiles] = useState<File[]>([]);
    // ไฟล์ที่อัปโหลดเข้าฉบับร่างแล้วในหน้านี้ (บันทึกร่าง หรือส่งไม่ผ่านแต่บันทึกร่างไว้) ล้างออกจากรายการแล้วแต่ยังนับเป็นเอกสารแนบ
    const [uploadedCount, setUploadedCount] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    // เปิดหน้าต่างเลือกจากตัวเลือก "ยื่นล่วงหน้า" = กรองเฉพาะสวัสดิการที่ยื่นล่วงหน้าได้
    const [pickerAdvance, setPickerAdvance] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const benefit = list.find((item) => item.code === benefitCode);
    const fields = fieldsFor(benefit?.formType);
    const amountField = fields.find((field) => field.key === 'amount');
    const systemAddress = addresses[person.code] ?? '';
    // ที่อยู่ในระบบใช้ค่าปัจจุบันของผู้รับสิทธิ์เสมอ ไม่ใช่ค่าที่บันทึกไว้ในร่าง
    const formValues = fields.some((field) => field.key === 'systemAddress') ? { ...values, systemAddress } : values;
    const detailFields = fields.filter((field) => field.key !== 'amount' && isFieldActive(field, formValues));
    const fixed = fixedAmount(benefit?.formType, values);
    const amount = fixed ?? (Number(values.amount) || 0);
    const receipt = needsReceipt(benefit?.formType);
    const revising = Boolean(initial?.revisionNote);
    // คำขอที่ส่งกลับมาแก้ไขกันวงเงินไว้อยู่แล้ว (ฐานข้อมูลไม่นับตัวเองซ้ำ) จึงคืนยอดเดิมก่อนเทียบ ไม่งั้นแก้แล้วส่งใหม่ไม่ได้
    // คืนเฉพาะเมื่อยอดเดิมถูกนับใน remaining จริง: สวัสดิการเดียวกัน ไม่ใช่ต่อครั้ง และวันที่เกิดค่าใช้จ่ายอยู่ในรอบวงเงินปัจจุบัน
    const originalDate = initial ? toClaimPayload(benefit?.formType, initial.values).expenseDate : '';
    const today = bangkokToday();
    const originalCounted =
        revising &&
        Boolean(benefit) &&
        benefit!.code === initial?.benefitCode &&
        benefit!.budgetType !== 'per_claim' &&
        Boolean(originalDate) &&
        (benefit!.budgetType === 'monthly' ? originalDate.slice(0, 7) === today.slice(0, 7) : originalDate.slice(0, 4) === today.slice(0, 4));
    const available = (benefit?.remaining ?? 0) + (originalCounted ? Number(initial?.values.amount) || 0 : 0);
    const overLimit = Boolean(benefit) && amount > available;
    // คำขอที่ส่งกลับมาแก้ไขถูกนับอยู่แล้ว จึงไม่กันซ้ำที่หน้าจอ ฐานข้อมูลตรวจอีกชั้นตอนส่ง
    const outOfClaims = Boolean(benefit) && benefit!.maxClaims !== null && benefit!.claimsThisYear >= benefit!.maxClaims! && !initial;
    // ยื่นล่วงหน้าได้เฉพาะสวัสดิการที่เปิดไว้ ระหว่างแก้ไขเปลี่ยนประเภทไม่ได้
    const advance = advanceChoice && Boolean(benefit?.allowAdvance);
    const typeLocked = revising;
    const advanceCount = list.filter((item) => item.allowAdvance && !blockedReason(item)).length;
    const openPicker = (advanceOnly: boolean) => {
        setPickerAdvance(advanceOnly);
        setPickerOpen(true);
    };
    const firstName = person.fullName.replace(/^(นาย|นางสาว|นาง|น\.ส\.)/, '').split(' ')[0];

    const setValue = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

    function switchPerson(nextProxy: boolean, code = targetCode) {
        const nextList = nextProxy ? (benefitsByEmployee[code] ?? []) : benefits;
        setProxy(nextProxy);
        setTargetCode(code);
        setBenefitCode(firstSelectable(nextList));
        setValues({});
        setClaimNo('');
        setUploadedCount(0);
        setAdvanceChoice(false);
        setError('');
        setNotice('');
    }

    function addFiles(selected: FileList | null) {
        const picked = Array.from(selected ?? []);
        const isBad = (file: File) => !ALLOWED_ATTACHMENT_TYPES.includes(file.type) || file.size > MAX_ATTACHMENT_BYTES;
        const bad = picked.filter(isBad);
        setError(bad.length ? `ไฟล์ ${bad.map((file) => file.name).join(', ')} ต้องเป็น PDF, JPG หรือ PNG และมีขนาดไม่เกิน 10 MB` : '');
        setFiles((current) => [...current, ...picked.filter((file) => !isBad(file))]);
        if (fileInput.current) fileInput.current.value = '';
    }

    function validateFields() {
        if (proxy && !reasonNote.trim()) return 'กรุณาระบุรายละเอียดเหตุที่พนักงานยื่นเองไม่ได้';
        if (outOfClaims) return `เบิกสวัสดิการนี้ครบ ${benefit?.maxClaims} ครั้งของปีนี้แล้ว`;
        if (formValues.addressSource === ADDRESS_SYSTEM && !systemAddress) return `ยังไม่มีที่อยู่ในระบบ กรุณาเลือก "${ADDRESS_OTHER}" แล้วกรอกที่อยู่`;
        const active = fields.filter((field) => isFieldActive(field, formValues));
        const missing = active.some((field) => field.key !== 'amount' && !field.optional && !formValues[field.key]?.trim());
        if (missing || amount <= 0) return 'กรุณากรอกข้อมูลให้ครบถ้วน';
        const invalid = active.find((field) => field.pattern && !field.pattern.regex.test(formValues[field.key]?.trim() ?? ''));
        if (invalid?.pattern) return invalid.pattern.message;
        if (overLimit) return `ยอดเบิกเกินวงเงินคงเหลือ ${money(available)} บาท`;
        return '';
    }

    async function send(submit: boolean) {
        if (!benefit || busy) return;
        const payload = toClaimPayload(benefit.formType, formValues);
        if (revising && !submit && (amount <= 0 || !payload.expenseDate)) {
            setError('คำขอที่ส่งกลับมาแก้ไขต้องระบุยอดเบิกและวันที่เกิดค่าใช้จ่าย');
            return;
        }
        // ตารางคำขอยังไม่มีช่องเหตุผลการยื่นแทน จึงเก็บไว้ต้นหมายเหตุให้ HR เห็น
        const fullNote = proxy ? [`ยื่นแทนเพราะ ${reason}: ${reasonNote.trim()}`, note.trim()].filter(Boolean).join(' · ') : note;
        setBusy(true);
        setError('');
        setNotice('');
        // ส่งแล้วไปหน้าสถานะ: คงปุ่ม "กำลังส่ง" ไว้จนหน้าใหม่แสดง
        let leaving = false;
        try {
            const body = new FormData();
            body.append(
                'payload',
                JSON.stringify({
                    ...payload,
                    claimNo,
                    ...(proxy ? { employeeCode: person.code } : initial?.employeeCode ? { employeeCode: initial.employeeCode } : {}),
                    benefitCode: benefit.code,
                    note: fullNote,
                    receiptNo: advance || !receipt ? '' : receiptNo,
                    receiptDate: advance || !receipt ? '' : receiptDate,
                    advance,
                    submit,
                }),
            );
            files.forEach((file) => body.append('files', file));
            const response = await fetch('/api/claims', { method: 'POST', body });
            const data = await response.json();
            if (data.claimNo) setClaimNo(data.claimNo);
            if (!response.ok) {
                if (data.claimNo) {
                    setUploadedCount((count) => count + files.length);
                    setFiles([]);
                }
                setError(data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
                return;
            }
            setUploadedCount((count) => count + files.length);
            setFiles([]);
            if (submit && !proxy) {
                leaving = true;
                nav.navigate('/employee/status', { refresh: true });
                return;
            }
            if (submit) {
                // คำขอที่ยื่นแทนเป็นของพนักงานคนนั้น จึงไม่อยู่ในรายการของคุณ ล้างฟอร์มไว้ยื่นรายการถัดไป
                setNotice(`ส่งคำขอ ${data.claimNo} แทน ${person.fullName} แล้ว`);
                setClaimNo('');
                setUploadedCount(0);
                setValues({});
                setNote('');
                setReceiptNo('');
                setReceiptDate('');
                setAgreed(false);
                nav.refresh();
                return;
            }
            setNotice(`บันทึกฉบับร่าง ${data.claimNo} แล้ว`);
        } catch {
            setError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        } finally {
            if (!leaving) setBusy(false);
        }
    }

    function submit() {
        const problem = validateFields();
        if (problem) return setError(problem);
        if (!advance) {
            if (receipt && (!receiptNo.trim() || !receiptDate)) return setError('กรุณาระบุเลขที่และวันที่ในใบเสร็จ');
            if (files.length + uploadedCount + (initial?.attachments.length ?? 0) === 0) return setError('กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์');
        }
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
    const documents = advance
        ? ['ใบเสนอราคาหรือใบแจ้งค่าใช้จ่าย (ถ้ามี)', ...(benefit?.documents ?? [])]
        : [...(receipt ? ['ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน'] : []), ...(benefit?.documents ?? [])];
    // ผู้ยื่นคือคนที่กรอกฟอร์มเสมอ ส่วนผู้รับสิทธิ์คือเจ้าของวงเงินที่ถูกหัก (ตัวเอง หรือพนักงานที่ยื่นแทน)
    const remainingAfter = benefit ? Math.max(available - amount, 0) : 0;
    const summary: { label: string; value: string; strong?: boolean; danger?: boolean }[] = [
        { label: 'ผู้ยื่น', value: proxy ? `${applicant.fullName} (หัวหน้าแผนก)` : applicant.fullName },
        { label: 'ผู้รับสิทธิ์', value: proxy ? `${person.fullName} · ${person.code}` : 'ตัวเอง' },
        { label: 'สวัสดิการ', value: benefit?.name ?? '—' },
        { label: 'ประเภท', value: `${advance ? 'ยื่นล่วงหน้า' : 'ยื่นเบิก'}${proxy ? ' · ยื่นแทน' : ''}` },
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
                description={revising ? benefit?.name : `กรอกเฉพาะช่องที่มีเครื่องหมาย * ข้อมูลพนักงานดึงจากระบบ อัตโนมัติ${claimNo ? ` · ${claimNo}` : ''}`}
            />

            {initial?.revisionNote ? (
                <section aria-label="สิ่งที่ต้องแก้ไข" className="flex flex-col gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-[18px] py-4">
                    <p className="text-13 font-medium text-orange-800">HR ส่งกลับให้แก้ไข</p>
                    <p className="text-14 text-orange-950">&ldquo;{initial.revisionNote}&rdquo;</p>
                    <p className="text-12 text-orange-800">วงเงินยังกันไว้ให้ระหว่างแก้ไข ถ้ายกเลิกคำขอ ระบบคืนวงเงินและจำนวนครั้ง</p>
                </section>
            ) : null}
<br />
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
                            <p className="mb-2.5 text-12 text-muted">
                                ข้อมูลผู้ขอ
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {personFields.map((field) => (
                                    <div key={field.label}>
                                        <p className="mb-1.5 text-13 font-medium text-ink-soft">{field.label}</p>
                                        <input readOnly aria-readonly="true" aria-label={`${field.label} (แก้ไขไม่ได้)`} value={field.value} className={lockedClass} />
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
                            <button
                                type="button"
                                role="radio"
                                aria-checked={!advance}
                                aria-disabled={typeLocked && advance}
                                onClick={() => !typeLocked && setAdvanceChoice(false)}
                                className={cx(choice(!advance), typeLocked && advance && 'cursor-not-allowed')}
                            >
                                <span className="block font-semibold">ยื่นเบิก</span>
                                <span className="block text-12 text-muted">จ่ายเงินไปแล้ว มีใบเสร็จพร้อมแนบ</span>
                            </button>
                            {benefit?.allowAdvance ? (
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={advance}
                                    aria-disabled={typeLocked && !advance}
                                    onClick={() => !typeLocked && setAdvanceChoice(true)}
                                    className={cx(choice(advance), typeLocked && !advance && 'cursor-not-allowed')}
                                >
                                    <span className="block font-semibold">ยื่นล่วงหน้า</span>
                                    <span className="block text-12 text-muted">รับเงินก่อน แนบใบเสร็จภายใน {benefit.advanceReceiptDays} วันหลังได้รับเงิน</span>
                                </button>
                            ) : (
                                <button type="button" role="radio" aria-checked="false" aria-disabled="true" className={cx(choice(false), 'cursor-not-allowed border-dashed bg-surface text-slate-400 hover:border-slate-300')}>
                                    <span className="block font-semibold">ยื่นล่วงหน้า</span>
                                    <span className="block text-12">{advanceCount > 0 ? 'สวัสดิการนี้ยื่นล่วงหน้าไม่ได้' : 'ยังไม่มีสวัสดิการที่ยื่นล่วงหน้าได้'}</span>
                                </button>
                            )}
                        </div>
                        {advance && benefit ? (
                            <div className="flex flex-col gap-0.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-13 text-amber-800">
                                <span>• วันที่เกิดค่าใช้จ่าย ให้ระบุวันที่คาดว่าจะใช้จ่าย</span>
                                <span>• ต้องแนบใบเสร็จจริงภายใน {benefit.advanceReceiptDays} วันหลังได้รับเงิน ที่หน้าติดตามสถานะ</span>
                                <span>• ไม่แนบภายในกำหนด ระบบยกเลิกรายการและต้องคืนเงินล่วงหน้าทั้งหมด</span>
                            </div>
                        ) : null}

                        <p className="-mb-1.5 mt-1 text-13 font-medium text-ink-soft">
                            สวัสดิการ
                            <Required />
                        </p>
                        {benefit ? (
                            <div className="flex flex-wrap items-center gap-3.5 rounded-[10px] border-[1.5px] border-primary-600 bg-primary-50 p-3">
                                {benefit.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element -- รูปจาก storage ผ่านลิงก์ชั่วคราว
                                    <img src={benefit.imageUrl} alt="" className="h-[72px] w-24 shrink-0 rounded-lg bg-mist object-cover" />
                                ) : (
                                    <div aria-hidden="true" className="flex h-[72px] w-24 shrink-0 items-center justify-center rounded-lg bg-mist text-muted">
                                        <ImageIcon className="size-6" strokeWidth={1.5} />
                                    </div>
                                )}
                                <div className="min-w-0 flex-[1_1_260px]">
                                    <p className="text-12 text-muted">
                                        {benefit.code} · {benefit.category}
                                    </p>
                                    <p className="text-16 font-semibold">{benefit.name}</p>
                                    <p className={cx('text-13', outOfClaims ? 'text-status-rejected' : 'text-ink-soft')}>
                                        คงเหลือ <b className="font-semibold tabular-nums">{baht(benefit.remaining)}</b>
                                        {proxy ? ` (ของ${firstName})` : ''} · {countText(benefit)}
                                    </p>
                                    <p className="flex flex-wrap items-center gap-2 text-12 text-status-approved-ink">
                                        เบิกได้เฉพาะตัวเอง
                                        {benefit.allowAdvance ? <AdvanceTag /> : null}
                                    </p>
                                </div>
                                {revising ? (
                                    <span className="text-12 text-muted">เปลี่ยนไม่ได้ระหว่างแก้ไข</span>
                                ) : (
                                    <button type="button" aria-haspopup="dialog" onClick={() => openPicker(advance)} className={pill.outline}>
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
                            {receipt ? '3. รายละเอียดค่าใช้จ่าย' : '3. รายละเอียดผลกระทบ'}
                        </h2>
                        <div className="grid gap-3.5 sm:grid-cols-2">
                            {detailFields.map((field) => {
                                const value = formValues[field.key] ?? '';
                                const label = (
                                    <label htmlFor={field.key} className={labelClass}>
                                        {field.label}
                                        {field.optional ? null : <Required />}
                                    </label>
                                );
                                if (field.type === 'radio') {
                                    // ระดับผลกระทบแสดงยอดเบิกที่ได้ในแต่ละตัวเลือก
                                    const amountOf = (option: string) => FLOOD_LEVELS.find((level) => level.label === option)?.amount;
                                    return (
                                        <fieldset key={field.key} className={cx(field.wide && 'sm:col-span-2')}>
                                            <legend className={labelClass}>
                                                {field.label}
                                                {field.optional ? null : <Required />}
                                            </legend>
                                            <div className={cx('grid gap-2', (field.options?.length ?? 0) > 2 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
                                                {field.options?.map((option) => {
                                                    const optionAmount = amountOf(option);
                                                    const [head, ...rest] = option.split(' · ');
                                                    return (
                                                        <label key={option} className={cx(choice(value === option), 'cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500')}>
                                                            <input type="radio" name={field.key} value={option} checked={value === option} onChange={() => setValue(field.key, option)} className="sr-only" />
                                                            {optionAmount !== undefined ? (
                                                                <>
                                                                    <span className="text-12 text-muted">{head}</span>
                                                                    <span className="font-semibold">{rest.join(' · ')}</span>
                                                                    <span className="mt-1 text-13 font-semibold tabular-nums text-primary-700">{baht(optionAmount)}</span>
                                                                </>
                                                            ) : (
                                                                <span className={cx(value === option && 'font-semibold')}>{option}</span>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </fieldset>
                                    );
                                }
                                if (field.readOnly) {
                                    return (
                                        <div key={field.key} className={cx(field.wide && 'sm:col-span-2')}>
                                            {label}
                                            {value ? (
                                                <p id={field.key} className="rounded-lg border border-line bg-slate-100 px-3 py-2.5 text-14 text-slate-700">
                                                    {value}
                                                </p>
                                            ) : (
                                                <p id={field.key} role="alert" className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2.5 text-13 text-orange-900">
                                                    ยังไม่มีที่อยู่ในระบบ กรุณาเลือก &ldquo;{ADDRESS_OTHER}&rdquo; แล้วกรอกที่อยู่
                                                </p>
                                            )}
                                        </div>
                                    );
                                }
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
                                    <div key={field.key} className={cx(field.wide && 'sm:col-span-2')}>
                                        {label}
                                        <input
                                            id={field.key}
                                            type={field.type}
                                            value={value}
                                            onChange={(e) => setValue(field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            inputMode={field.pattern ? 'numeric' : undefined}
                                            maxLength={field.pattern ? 5 : undefined}
                                            className={inputClass}
                                        />
                                    </div>
                                );
                            })}
                            {advance || !receipt ? null : (
                                <>
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
                                </>
                            )}
                        </div>
                        {amountField && fixed !== null ? (
                            <div className="sm:max-w-[50%] sm:pr-[7px]">
                                <label htmlFor="amount" className={labelClass}>
                                    {amountField.label} (บาท)
                                </label>
                                <input id="amount" readOnly value={fixed ? money(fixed) : ''} placeholder="เลือกระดับผลกระทบ" aria-describedby="amount-hint" aria-invalid={overLimit} className={cx(lockedClass, 'text-right tabular-nums')} />
                                <p id="amount-hint" role={overLimit ? 'alert' : undefined} className={cx('mt-1 text-12', overLimit ? 'text-status-rejected' : 'text-muted')}>
                                    {overLimit ? `ยอดตามระดับเกินวงเงินคงเหลือ ${money(available)} บาท` : 'ยอดเบิกกำหนดตามระดับผลกระทบ HR ตรวจกับรูปหลักฐาน'}
                                </p>
                            </div>
                        ) : amountField ? (
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
                                    max={benefit ? available : undefined}
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
                                        {overLimit ? `ยอดเบิกเกินวงเงินคงเหลือ ${money(available)} บาท` : `ไม่เกินวงเงินคงเหลือ ${baht(available)}`}
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
                            4. เอกสารแนบ{advance ? ' (ไม่บังคับ)' : ''}
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
                            <ul aria-label="ไฟล์ที่แนบ" className="grid grid-cols-2 gap-3 text-13 sm:grid-cols-3 md:grid-cols-4">
                                {initial?.attachments.map((file) => (
                                    <AttachmentTile key={file.src} name={file.name} src={file.src} isImage={file.isImage} meta="แนบไว้แล้ว" />
                                ))}
                                {files.map((file, index) => (
                                    <NewAttachmentTile key={`${file.name}-${file.lastModified}-${index}`} file={file} onRemove={() => setFiles((current) => current.filter((_, i) => i !== index))} />
                                ))}
                            </ul>
                        ) : null}
                        <p className="text-13 text-ink-soft">เอกสารที่ต้องแนบ:</p>
                        <ul className="flex flex-col gap-1.5 text-13">
                            {documents.map((name) => (
                                <li key={name} className="flex items-center gap-2">
                                    <FileText className="size-4 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
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
                advanceOnly={pickerAdvance}
                subtitle={
                    pickerAdvance
                        ? 'แสดงเฉพาะสวัสดิการที่ยื่นล่วงหน้าได้ กดตัวกรอง "ยื่นล่วงหน้าได้" อีกครั้งเพื่อดูทั้งหมด'
                        : proxy
                          ? `แสดงสิทธิ์และวงเงินของ ${person.fullName}`
                          : 'ค้นหาหรือกรองตามหมวด สวัสดิการที่ใช้ไม่ได้แสดงเป็นสีเทาพร้อมเหตุผล'
                }
                onPick={(code) => {
                    const picked = list.find((item) => item.code === code);
                    if (code !== benefitCode) {
                        setBenefitCode(code);
                        setValues({});
                        setError('');
                    }
                    // เลือกมาจากตัวเลือกยื่นล่วงหน้า และสวัสดิการนั้นยื่นได้ -> ตั้งเป็นยื่นล่วงหน้าให้เลย
                    setAdvanceChoice(Boolean(pickerAdvance && picked?.allowAdvance) || (code === benefitCode && advanceChoice));
                    setPickerOpen(false);
                }}
                onClose={() => setPickerOpen(false)}
            />
        </>
    );
}

const fileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

/** การ์ดไฟล์แนบ: รูปแสดงตัวอย่าง ไฟล์อื่น (PDF) แสดงไอคอน กดที่ตัวอย่างเพื่อเปิดไฟล์เต็ม */
function AttachmentTile({ name, src, isImage, meta, onRemove }: { name: string; src: string | null; isImage: boolean; meta: string; onRemove?: () => void }) {
    return (
        <li className="relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-white">
            <a href={src ?? undefined} target="_blank" rel="noreferrer" aria-label={`เปิดไฟล์ ${name}`} className="block h-[104px] bg-mist">
                {isImage && src ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ตัวอย่างไฟล์ในเครื่องหรือลิงก์ชั่วคราวจาก storage
                    <img src={src} alt="" className="size-full object-cover" />
                ) : (
                    <span className="flex size-full flex-col items-center justify-center gap-1 text-muted">
                        <FileText className="size-7" strokeWidth={1.5} aria-hidden="true" />
                        <span className="text-11 font-semibold uppercase">{name.split('.').pop()}</span>
                    </span>
                )}
            </a>
            <span className="flex flex-col px-2.5 py-2">
                <span className="truncate font-medium text-ink" title={name}>
                    {name}
                </span>
                <span className="text-12 text-muted">{meta}</span>
            </span>
            {onRemove ? (
                <button
                    type="button"
                    onClick={onRemove}
                    aria-label={`นำ ${name} ออก`}
                    className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-white/90 text-ink-soft shadow-[0_1px_2px_rgba(15,23,42,.2)] hover:bg-white hover:text-ink"
                >
                    <X className="size-4" aria-hidden="true" />
                </button>
            ) : null}
        </li>
    );
}

/** ไฟล์ที่เพิ่งเลือก ยังไม่อัปโหลด ใช้ลิงก์ในเครื่องเพื่อแสดงตัวอย่าง */
function NewAttachmentTile({ file, onRemove }: { file: File; onRemove: () => void }) {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return <AttachmentTile name={file.name} src={src} isImage={file.type.startsWith('image/')} meta={fileSize(file.size)} onRemove={onRemove} />;
}
