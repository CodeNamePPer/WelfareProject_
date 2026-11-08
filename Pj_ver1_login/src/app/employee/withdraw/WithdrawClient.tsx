'use client';

import { useMemo, useState } from 'react';

const steps = [
    { label: 'กรอกข้อมูล', active: 'กรอกข้อมูลและแนบเอกสาร' },
    { label: 'ยืนยัน', active: 'ตรวจสอบและส่ง' },
];

const initialForm = {
    employeeId: '',
    fullName: '',
    department: '',
    policyType: 'ค่ารักษาพยาบาล',
    claimType: 'เบิกตามใบเสร็จ',
    hospital: 'โรงพยาบาลบำรุงราษฎร์',
    requestDate: '12 ต.ค. 2569',
    amount: '1,800.00',
    coverage: '7,500.00',
    note: '',
    invoice: 'ใบเสร็จ.pdf',
    patientName: '',
    treatmentType: '',
    courseName: '',
    vaccineName: '',
};

const policyFieldConfig: Record<string, { title: string; fields: { key: keyof typeof initialForm; label: string; type: 'input' | 'textarea'; placeholder?: string }[] }> = {
    'ค่ารักษาพยาบาล': {
      title: '2. ข้อมูลผู้เข้ารับการรักษาและค่าใช้จ่าย',
      fields: [
        { key: 'hospital', label: 'ชื่อสถานพยาบาล / คลินิก', type: 'input', placeholder: 'ระบุชื่อสถานพยาบาล' },
        { key: 'patientName', label: 'ชื่อผู้ป่วย', type: 'input', placeholder: 'ระบุชื่อผู้ป่วย' },
        { key: 'requestDate', label: 'วันที่ต้องการเบิก', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
        { key: 'note', label: 'หมายเหตุ', type: 'textarea', placeholder: 'กรอกรายละเอียดเพิ่มเติม' },
      ],
    },
    'ค่าทันตกรรม': {
      title: '2. ข้อมูลผู้เข้ารับการรักษาและค่าใช้จ่าย',
      fields: [
        { key: 'hospital', label: 'ชื่อคลินิก / ทันตแพทย์', type: 'input', placeholder: 'ระบุชื่อคลินิกทันตกรรม' },
        { key: 'patientName', label: 'ชื่อผู้เข้ารับบริการ', type: 'input', placeholder: 'ระบุชื่อผู้ป่วย' },
        { key: 'treatmentType', label: 'ประเภทการรักษา', type: 'input', placeholder: 'เช่น ขูดหินปูน / ร้อยกราม' },
        { key: 'requestDate', label: 'วันที่เข้ารับบริการ', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
      ],
    },
    'ตรวจสุขภาพประจำปี': {
      title: '2. ข้อมูลผู้เข้ารับการรักษาและค่าใช้จ่าย',
      fields: [
        { key: 'hospital', label: 'ชื่อสถานพยาบาล / คลินิก', type: 'input', placeholder: 'ระบุชื่อสถานพยาบาล' },
        { key: 'treatmentType', label: 'ประเภทการตรวจสุขภาพ', type: 'input', placeholder: 'เช่น ตรวจร่างกายประจำปี' },
        { key: 'requestDate', label: 'วันที่เข้ารับการตรวจ', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
      ],
    },
    'ค่าลงทะเบียนอบรม': {
      title: '2. ข้อมูลหลักสูตรและค่าใช้จ่าย',
      fields: [
        { key: 'courseName', label: 'ชื่อหลักสูตร / สถาบัน', type: 'input', placeholder: 'ระบุชื่อหลักสูตร' },
        { key: 'treatmentType', label: 'ประเภทหลักสูตร', type: 'input', placeholder: 'เช่น ฝึกอบรม / หลักสูตรออนไลน์' },
        { key: 'requestDate', label: 'วันที่อบรม / ลงทะเบียน', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
      ],
    },
    'ค่ารักษาพยาบาลบุตร': {
      title: '2. ข้อมูลผู้เข้ารับการรักษาและค่าใช้จ่าย',
      fields: [
        { key: 'patientName', label: 'ชื่อบุตร / ผู้ป่วย', type: 'input', placeholder: 'ระบุชื่อบุตร' },
        { key: 'hospital', label: 'ชื่อสถานพยาบาล / คลินิก', type: 'input', placeholder: 'ระบุชื่อสถานพยาบาล' },
        { key: 'requestDate', label: 'วันที่เข้ารับบริการ', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
        { key: 'note', label: 'หมายเหตุ', type: 'textarea', placeholder: 'กรอกรายละเอียดเพิ่มเติม' },
      ],
    },
    'ค่าภูมิคุ้มกันบุตร': {
      title: '2. ข้อมูลวัคซีนและค่าใช้จ่าย',
      fields: [
        { key: 'patientName', label: 'ชื่อบุตร / ผู้รับบริการ', type: 'input', placeholder: 'ระบุชื่อบุตร' },
        { key: 'vaccineName', label: 'ชื่อวัคซีน', type: 'input', placeholder: 'เช่น วัคซีน MMR, DTaP' },
        { key: 'hospital', label: 'ชื่อคลินิก / โรงพยาบาล', type: 'input', placeholder: 'ระบุสถานที่ฉีดวัคซีน' },
        { key: 'requestDate', label: 'วันที่ฉีดวัคซีน', type: 'input', placeholder: 'วว ดด ปปปป' },
        { key: 'amount', label: 'จำนวนเงิน', type: 'input', placeholder: '0.00' },
      ],
    },
};

export default function WithdrawClient({ applicant }: { applicant: { employeeId: string; fullName: string; department: string } }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [form, setForm] = useState({ ...initialForm, ...applicant });
    const [agreed, setAgreed] = useState(false);

    const summaryItems = useMemo(
        () => [
            { label: 'สิทธิ์สวัสดิการ', value: form.policyType },
            { label: 'วงเงินรวม', value: '10,000.00 บาท' },
            { label: 'ใช้ไปแล้ว', value: '2,500.00 บาท' },
            { label: 'คงเหลือ', value: '7,500.00 บาท' },
            { label: 'เบิกครั้งนี้', value: `${form.amount} บาท` },
            { label: 'คงเหลือหลังเบิก', value: '5,700.00 บาท' },
        ],
        [form.amount, form.policyType],
    );

    const setValue = (key: keyof typeof initialForm, value: string) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

    return (
        <div className="mx-auto max-w-[1250px] px-4 py-5 text-ink">
            <div className="mb-4">
                <h1 className="text-22 font-semibold tracking-[-0.04em] text-ink">ยื่นคำขอวัสดิการ</h1>
                <p className="mt-1 text-13 text-muted">แบบฟอร์มยื่นคำขอเบิกสวัสดิการตามสิทธิ์ของคุณ</p>
            </div>

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
                                            <label className="mb-2 block text-13 font-medium text-ink-soft">รหัสพนักงาน</label>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">
                                                {form.employeeId}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="mb-2 block text-13 font-medium text-ink-soft">สังกัด</label>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">
                                                {form.department}
                                            </div>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block text-13 font-medium text-ink-soft">ชื่อ-นามสกุล</label>
                                            <div className="flex h-11 w-full items-center rounded-lg border border-line bg-white px-3 text-13 font-medium text-ink-soft">
                                                {form.fullName}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border border-line bg-surface p-4">
                                    <div className="mb-4">
                                        <h3 className="text-18 font-semibold text-ink">
                                            {policyFieldConfig[form.policyType]?.title ?? '2. ข้อมูลผู้เข้ารับการรักษาและค่าใช้จ่าย'}
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block text-13 font-medium text-ink-soft">สิทธิ์สวัสดิการ</label>
                                                <select
                                                    value={form.policyType}
                                                    onChange={(e) => setValue('policyType', e.target.value)}
                                                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                                >
                                                    {['ค่ารักษาพยาบาล', 'ค่าทันตกรรม', 'ตรวจสุขภาพประจำปี', 'ค่าลงทะเบียนอบรม', 'ค่ารักษาพยาบาลบุตร', 'ค่าภูมิคุ้มกันบุตร'].map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="mb-2 block text-13 font-medium text-ink-soft">ประเภทการเบิก</label>
                                                <select
                                                    value={form.claimType}
                                                    onChange={(e) => setValue('claimType', e.target.value)}
                                                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                                >
                                                    {['เบิกตามใบเสร็จ', 'เบิกแบบผู้ป่วยนอก', 'เบิกแบบค่าห้องพัก', 'เบิกแบบยกเว้น'].map((option) => (
                                                        <option key={option} value={option}>{option}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {((policyFieldConfig[form.policyType] ?? policyFieldConfig['ค่ารักษาพยาบาล']).fields).map((field) => {
                                            const value = form[field.key] ?? '';
                                            const className = 'h-11 w-full rounded-lg border border-line bg-white px-3 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';

                                            return (
                                                <div key={field.label}>
                                                    <label className="mb-2 block text-13 font-medium text-ink-soft">{field.label}</label>
                                                    {field.type === 'textarea' ? (
                                                        <textarea
                                                            value={value}
                                                            onChange={(e) => setValue(field.key, e.target.value)}
                                                            rows={3}
                                                            placeholder={field.placeholder}
                                                            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-13 text-ink-soft outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                                                        />
                                                    ) : (
                                                        <input
                                                            value={value}
                                                            onChange={(e) => setValue(field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className={className}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
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

                            <div className="rounded-xl border border-dashed border-line bg-surface p-4">
                                <div className="flex items-center justify-between rounded-lg border border-line bg-white p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-50 text-ink-soft">PDF</div>
                                        <div>
                                            <div className="text-13 font-medium text-ink">{form.invoice}</div>
                                            <div className="text-12 text-muted">แนบใบเสร็จและเอกสารประกอบ</div>
                                        </div>
                                    </div>
                                    <button type="button" className="rounded-lg border border-line bg-white px-3 py-2 text-12 font-medium text-ink-soft hover:bg-surface">อัปโหลด</button>
                                </div>
                            </div>

                            <div className="mt-5 rounded-xl border border-line bg-surface p-4 text-13 text-ink-soft">
                                <label className="flex items-start gap-3">
                                    <input type="checkbox" checked={agreed} onChange={() => setAgreed((prev) => !prev)} className="mt-1 h-4 w-4 rounded border-line text-sky-600 focus:ring-sky-500" />
                                    <span>ข้าพเจ้ายืนยันว่าข้อมูลดังกล่าวเป็นความจริงทุกประการ และยินยอมให้บริษัทตรวจสอบข้อมูลตามเงื่อนไขของสวัสดิการ</span>
                                </label>
                            </div>
                        </>
                    )}

                    <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                        <button
                            type="button"
                            onClick={prevStep}
                            disabled={currentStep === 0}
                            className="rounded-lg border border-line bg-white px-5 py-2.5 text-13 font-medium text-ink-soft disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            ย้อนกลับ
                        </button>

                        <div className="flex gap-3">
                            <button type="button" className="rounded-lg border border-line bg-white px-5 py-2.5 text-13 font-medium text-ink-soft">บันทึกร่าง</button>
                            <button
                                type="button"
                                onClick={nextStep}
                                className="rounded-lg bg-primary-600 px-5 py-2.5 text-13 font-medium text-white hover:bg-primary-700"
                            >
                                {currentStep === 0 ? 'ไปหน้าถัดไป' : 'ส่งคำขอ'}
                            </button>
                        </div>
                    </div>
                </div>

                <aside className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="mb-4">
                        <h3 className="text-18 font-semibold text-ink">ตรวจสอบก่อนส่ง</h3>
                    </div>

                    <div className="space-y-3 rounded-xl border border-line bg-surface p-4 text-13">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-11 uppercase tracking-[0.08em] text-muted">สิทธิ์</div>
                                <div className="mt-1 font-medium text-ink">{form.policyType}</div>
                            </div>
                            <span className="rounded-full border border-status-approved-soft bg-status-approved-soft px-2 py-1 text-10 font-medium text-status-approved-ink">ใช้สิทธิ์ได้</span>
                        </div>

                        <div className="space-y-2 border-t border-line pt-3">
                            {summaryItems.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-3 text-13">
                                    <span className="text-muted">{item.label}</span>
                                    <span className="font-medium text-ink">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 rounded-xl border border-line bg-white p-4 text-13 text-ink-soft">
                        <div className="font-medium text-ink">เงื่อนไข</div>
                        <ul className="mt-3 space-y-2">
                            <li>• ต้องแนบหลักฐานการเบิกให้ครบถ้วน</li>
                            <li>• วงเงินที่เหลือจะปรับตามคำขอปัจจุบัน</li>
                            <li>• หากเอกสารไม่ครบกระบวนการจะถูกยกเลิก</li>
                        </ul>
                    </div>
                </aside>
            </div>
        </div>
    );
}
