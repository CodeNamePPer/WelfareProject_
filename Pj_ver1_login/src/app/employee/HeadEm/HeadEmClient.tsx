'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Subordinate } from '@/lib/employee/subordinates';
import { fieldsFor, toClaimPayload } from '@/lib/claims/forms';
import type { EmployeeBenefit } from '@/lib/claims/types';

const EMPTY_BENEFIT: EmployeeBenefit = { code: '', name: 'ไม่มีสิทธิ์สวัสดิการ', description: null, category: '', formType: 'general', budgetType: 'yearly', budgetLabel: 'ปี', limit: 0, used: 0, pending: 0, remaining: 0 };

const steps = ['ข้อมูลพนักงานและคำขอ', 'เอกสารและยืนยัน'];

function formatAmount(amount: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function HeadEmClient({ employees, benefitsByEmployee }: { employees: Subordinate[]; benefitsByEmployee: Record<string, EmployeeBenefit[]> }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [employeeId, setEmployeeId] = useState(employees[0].id);
  const benefits = benefitsByEmployee[employeeId] ?? [];
  const [benefitName, setBenefitName] = useState(benefitsByEmployee[employees[0].id]?.[0]?.name ?? '');
  const [formData, setFormData] = useState<Record<string, Record<string, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [formError, setFormError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [claimNo, setClaimNo] = useState('');
  const [receiptNo, setReceiptNo] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [busy, setBusy] = useState(false);

  const employee = employees.find((item) => item.id === employeeId) ?? employees[0];
  const benefit = benefits.find((item) => item.name === benefitName) ?? benefits[0] ?? EMPTY_BENEFIT;
  const fields = fieldsFor(benefit.formType);
  const currentFormData = formData[benefitName] ?? {};
  const requestedAmount = Number(currentFormData.amount) || 0;
  const remainingAfterRequest = Math.max(benefit.remaining - requestedAmount, 0);
  const amountExceedsBalance = requestedAmount > benefit.remaining;

  const requestDetails = fields.map((field) => ({
    label: field.label,
    value: field.key === 'amount'
      ? `${formatAmount(requestedAmount)} บาท`
      : currentFormData[field.key] || 'ยังไม่ได้ระบุ',
  }));
  const summaryItems = [
    { label: 'วงเงินสวัสดิการ', value: `${formatAmount(benefit.limit)} บาท` },
    { label: 'คงเหลือก่อนเบิก', value: `${formatAmount(benefit.remaining)} บาท` },
    { label: 'ยอดที่ขอเบิก', value: `${formatAmount(requestedAmount)} บาท` },
    { label: 'คงเหลือหลังเบิก', value: `${formatAmount(remainingAfterRequest)} บาท` },
    ...requestDetails,
  ];

  function setFieldValue(key: string, value: string) {
    setFormData((currentData) => ({
      ...currentData,
      [benefitName]: {
        ...currentData[benefitName],
        [key]: value,
      },
    }));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    const maxFileSize = 10 * 1024 * 1024;
    const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    const validFiles = selectedFiles.filter((file) => {
      const hasAllowedType = allowedTypes.has(file.type)
        || (file.type === '' && /\.(pdf|jpe?g|png)$/i.test(file.name));
      return hasAllowedType && file.size <= maxFileSize;
    });
    const rejectedFile = selectedFiles.find((file) => !validFiles.includes(file));

    if (rejectedFile) {
      setFormError(`ไฟล์ ${rejectedFile.name} มีรูปแบบไม่รองรับหรือมีขนาดเกิน 10 MB`);
    } else if (validFiles.length > 0) {
      setFormError('');
    }

    setFiles((currentFiles) => [...currentFiles, ...validFiles]);
    event.target.value = '';
  }

  function continueToDocuments() {
    const hasMissingField = fields.some((field) => !currentFormData[field.key]?.trim());
    if (!employeeId || hasMissingField || requestedAmount <= 0) {
      setFormError('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
      return;
    }

    if (amountExceedsBalance) {
      setFormError('ยอดที่ขอเบิกเกินวงเงินสวัสดิการคงเหลือ');
      return;
    }

    setFormError('');
    setCurrentStep(1);
  }

  async function send(submit: boolean) {
    if (busy || !benefit.code) return;
    setBusy(true);
    setFormError('');
    setDraftSaved(false);
    try {
      const body = new FormData();
      body.append('payload', JSON.stringify({ ...toClaimPayload(benefit.formType, currentFormData), claimNo, employeeCode: employeeId, benefitCode: benefit.code, receiptNo, receiptDate, submit }));
      files.forEach((file) => body.append('files', file));
      const response = await fetch('/api/claims', { method: 'POST', body });
      const data = await response.json();
      if (data.claimNo) {
        setClaimNo(data.claimNo);
        setFiles([]);
      }
      if (!response.ok) {
        setFormError(data.error ?? 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        return;
      }
      if (submit) setSubmitted(true);
      else setDraftSaved(true);
    } catch {
      setFormError('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setBusy(false);
    }
  }

  function submitRequest() {
    if (!receiptNo.trim() || !receiptDate) {
      setFormError('กรุณาระบุเลขที่และวันที่ในใบเสร็จ');
      return;
    }

    if (files.length === 0 && !claimNo) {
      setFormError('กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์');
      return;
    }

    if (!agreed) {
      setFormError('กรุณายืนยันความถูกต้องของข้อมูลก่อนส่งคำขอ');
      return;
    }

    void send(true);
  }

  return (
    <div className="mx-auto min-w-[1080px] max-w-[1480px] bg-white px-4 py-4 text-ink">

      <header className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-22 font-semibold tracking-tight text-ink">
            ยื่นคำขอสวัสดิการแทนพนักงาน
          </h1>
          <p className="mt-1 text-13 text-muted">
            เลือกพนักงาน ตรวจสอบสิทธิ์ และส่งคำขอพร้อมเอกสารประกอบ
          </p>
        </div>
        <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-12 font-medium text-primary-600">
          หัวหน้างาน · ยื่นแทน
        </span>
      </header>

      <div className="mt-4 flex items-center rounded-lg border border-line bg-white px-4 py-3">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep || submitted;

          return (
            <div key={step} className="flex flex-1 items-center gap-2">
              <span
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-12 font-semibold',
                  isComplete
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : isActive
                      ? 'border-primary-500 bg-primary-100 text-primary-700'
                      : 'border-line bg-white text-muted',
                ].join(' ')}
              >
              {isComplete ? (
                <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
                  <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : index + 1}
              </span>
              <span className={`text-13 ${isActive ? 'font-medium text-ink' : 'text-muted'}`}>
                {step}
              </span>
              {index < steps.length - 1 && <span className="mx-4 h-px flex-1 bg-line" />}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {submitted ? (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-approved-soft text-18 font-semibold text-status-approved-ink">
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                  <path d="m4.5 10 3.5 3.5 7.5-7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="mt-4 text-17 font-semibold text-ink">ส่งคำขอเรียบร้อยแล้ว</h2>
              <p className="mt-2 text-13 text-ink-soft">
                คำขอของ {employee.name} ถูกส่งให้ฝ่ายบุคคลตรวจสอบแล้ว
              </p>
              <p className="mt-1 text-12 text-muted">สามารถติดตามผลได้ที่เมนู “ติดตามสถานะ”</p>
            </div>
          ) : (
            <>
              {currentStep === 0 ? (
                <>
                  <div className="mb-5">
                    <h2 className="text-17 font-semibold text-ink">ข้อมูลพนักงานและคำขอ</h2>
                    <p className="mt-1 text-13 text-muted">ตรวจสอบข้อมูลผู้รับสิทธิ์ก่อนกรอกรายละเอียดการเบิก</p>
                  </div>

                  <div className="rounded-lg border border-line bg-surface p-4">
                    <label htmlFor="employee" className="mb-2 block text-13 font-medium text-ink-soft">
                      เลือกพนักงานผู้รับสิทธิ์ <span className="text-status-rejected">*</span>
                    </label>
                    <select
                      id="employee"
                      value={employeeId}
                      onChange={(event) => setEmployeeId(event.target.value)}
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-13 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                    >
                      {employees.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.id}
                        </option>
                      ))}
                    </select>

                    <div className="mt-3 grid grid-cols-3 gap-3 rounded-md border border-line bg-white p-3">
                      <div>
                        <p className="text-12 text-muted">ชื่อ-นามสกุล</p>
                        <p className="mt-1 text-13 font-medium text-ink">{employee.name}</p>
                      </div>
                      <div>
                        <p className="text-12 text-muted">รหัสพนักงาน</p>
                        <p className="mt-1 text-13 font-medium text-ink">{employee.id}</p>
                      </div>
                      <div>
                        <p className="text-12 text-muted">หน่วยงาน</p>
                        <p className="mt-1 text-13 font-medium text-ink">{employee.department}</p>
                      </div>
                    </div>
                    <p className="mt-2 text-12 text-muted">ตำแหน่ง: {employee.position}</p>
                  </div>

                  <div className="mt-4 border-t border-line pt-4">
                    <h3 className="text-14 font-semibold text-ink">ข้อมูลคำขอสวัสดิการ</h3>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="benefit" className="mb-1.5 block text-13 font-medium text-ink-soft">
                          ประเภทสวัสดิการ <span className="text-status-rejected">*</span>
                        </label>
                        <select
                          id="benefit"
                          value={benefitName}
                          onChange={(event) => setBenefitName(event.target.value)}
                          className="h-10 w-full rounded-md border border-line bg-white px-3 text-13 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                        >
                          {benefits.map((item) => (
                            <option key={item.name} value={item.name}>{item.name}</option>
                          ))}
                        </select>
                      </div>
                      {fields.map((field) => {
                        const fieldId = `request-${field.key}`;
                        const className = 'h-10 w-full rounded-md border border-line bg-white px-3 text-13 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100';

                        return (
                          <div key={field.key} className={field.wide || field.key === 'amount' ? 'col-span-2' : undefined}>
                            <label htmlFor={fieldId} className="mb-1.5 block text-13 font-medium text-ink-soft">
                              {field.label} <span className="text-status-rejected">*</span>
                            </label>
                            {field.type === 'textarea' ? (
                              <textarea
                                id={fieldId}
                                rows={3}
                                value={currentFormData[field.key] ?? ''}
                                onChange={(event) => setFieldValue(field.key, event.target.value)}
                                placeholder={field.placeholder}
                                className="w-full resize-none rounded-md border border-line bg-white px-3 py-2 text-13 text-ink outline-none placeholder:text-muted focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                              />
                            ) : field.type === 'select' ? (
                              <select
                                id={fieldId}
                                value={currentFormData[field.key] ?? ''}
                                onChange={(event) => setFieldValue(field.key, event.target.value)}
                                className={className}
                              >
                                <option value="">เลือก{field.label}</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : field.type === 'number' ? (
                              <div className="flex h-10 items-center rounded-md border border-line bg-white focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-100">
                                <input
                                  id={fieldId}
                                  value={currentFormData[field.key] ?? ''}
                                  onChange={(event) => setFieldValue(field.key, event.target.value)}
                                  className="h-full min-w-0 flex-1 rounded-md bg-transparent px-3 text-13 text-ink outline-none"
                                />
                                <span className="px-3 text-13 text-muted">บาท</span>
                              </div>
                            ) : (
                              <input
                                id={fieldId}
                                type={field.type}
                                value={currentFormData[field.key] ?? ''}
                                onChange={(event) => setFieldValue(field.key, event.target.value)}
                                placeholder={field.placeholder}
                                className={className}
                              />
                            )}
                            {field.key === 'amount' && amountExceedsBalance && (
                              <p className="mt-1 text-12 text-status-rejected">
                                ยอดเบิกเกินวงเงินคงเหลือ {formatAmount(benefit.remaining)} บาท
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="text-17 font-semibold text-ink">เอกสารและยืนยันคำขอ</h2>
                    <p className="mt-1 text-13 text-muted">แนบหลักฐานการเบิกและตรวจสอบข้อมูลก่อนส่ง</p>
                  </div>

                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="receiptNo" className="mb-1.5 block text-13 font-medium text-ink-soft">เลขที่ใบเสร็จ <span className="text-status-rejected">*</span></label>
                      <input id="receiptNo" value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} className="h-10 w-full rounded-md border border-line bg-white px-3 text-13 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    </div>
                    <div>
                      <label htmlFor="receiptDate" className="mb-1.5 block text-13 font-medium text-ink-soft">วันที่ในใบเสร็จ <span className="text-status-rejected">*</span></label>
                      <input id="receiptDate" type="date" value={receiptDate} onChange={(event) => setReceiptDate(event.target.value)} className="h-10 w-full rounded-md border border-line bg-white px-3 text-13 text-ink outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
                    </div>
                  </div>

                  <div className="rounded-lg border border-dashed border-line bg-surface p-5 text-center">
                    <p className="mb-1 text-13 font-medium text-ink">
                      เอกสารประกอบคำขอ <span className="text-status-rejected">*</span>
                    </p>
                    <label
                      htmlFor="documents"
                      className="flex cursor-pointer flex-col items-center rounded-md px-4 py-6 text-13 text-ink-soft hover:bg-white"
                    >
                      <svg aria-hidden="true" className="mb-2 h-6 w-6 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                        <path d="M12 16V4m0 0L8 8m4-4 4 4M5 14v5h14v-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium text-ink">เลือกไฟล์เพื่ออัปโหลด</span>
                      <span className="mt-1 text-12 text-muted">รองรับ PDF, JPG, PNG ขนาดไม่เกิน 10 MB ต่อไฟล์</span>
                    </label>
                    <input
                      id="documents"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      multiple
                      onChange={handleFileChange}
                      className="sr-only"
                    />
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-3 divide-y divide-line rounded-md border border-line">
                      {files.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="flex items-center justify-between px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-primary-50 px-2 py-1 text-10 font-semibold text-ink-soft">
                              {file.name.split('.').pop()?.toUpperCase() ?? 'FILE'}
                            </span>
                            <span className="text-13 text-ink-soft">{file.name}</span>
                            <span className="text-12 text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFiles((currentFiles) => currentFiles.filter((_, fileIndex) => fileIndex !== index))}
                            className="rounded px-2 py-1 text-12 text-muted hover:bg-primary-50 hover:text-status-rejected focus-visible:outline-2 focus-visible:outline-primary-600"
                          >
                            ลบ
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-4 rounded-lg border border-line bg-surface p-4">
                    <h3 className="text-13 font-semibold text-ink">ตรวจสอบคำขอ</h3>
                    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-13">
                      <div>
                        <dt className="text-12 text-muted">พนักงานผู้รับสิทธิ์</dt>
                        <dd className="mt-1 font-medium text-ink">{employee.name} · {employee.id}</dd>
                      </div>
                      <div>
                        <dt className="text-12 text-muted">ประเภทสวัสดิการ</dt>
                        <dd className="mt-1 font-medium text-ink">{benefit.name}</dd>
                      </div>
                      {fields.map((field) => (
                        <div key={field.key} className={field.wide ? 'col-span-2' : undefined}>
                          <dt className="text-12 text-muted">{field.label}</dt>
                          <dd className="mt-1 whitespace-pre-wrap font-medium text-ink">
                            {field.key === 'amount'
                              ? `${formatAmount(requestedAmount)} บาท`
                              : currentFormData[field.key] || 'ยังไม่ได้ระบุ'}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-4 text-13 text-ink-soft">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-line accent-primary-600 focus:ring-primary-100"
                    />
                    <span>ข้าพเจ้ายืนยันว่าข้อมูลและเอกสารประกอบถูกต้องครบถ้วน และได้รับอนุญาตให้ยื่นคำขอแทนพนักงานรายนี้</span>
                  </label>
                </>
              )}

              {formError && (
                <p role="alert" className="mt-4 rounded-md border border-status-rejected-soft bg-status-rejected-soft px-3 py-2 text-13 text-rose-800">
                  {formError}
                </p>
              )}
              {draftSaved && (
                <p role="status" className="mt-4 rounded-md border border-status-approved-soft bg-status-approved-soft px-3 py-2 text-13 text-status-approved-ink">
                  บันทึกฉบับร่าง {claimNo} แล้ว
                </p>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormError('');
                    setCurrentStep(0);
                  }}
                  disabled={currentStep === 0}
                  className="rounded-md border border-line bg-white px-4 py-2.5 text-13 font-medium text-ink-soft hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ย้อนกลับ
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void send(false)}
                    className="rounded-md border border-line bg-white px-4 py-2.5 text-13 font-medium text-ink-soft hover:bg-surface disabled:opacity-40"
                  >
                    บันทึกร่าง
                  </button>
                  {currentStep === 0 ? (
                    <button
                      type="button"
                      onClick={continueToDocuments}
                      className="rounded-md bg-primary-600 px-5 py-2.5 text-13 font-medium text-white hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      ไปขั้นตอนถัดไป
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitRequest}
                      disabled={!agreed || busy}
                      className="rounded-md bg-primary-600 px-5 py-2.5 text-13 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                      ส่งคำขอแทนพนักงาน
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-line bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h2 className="text-14 font-semibold text-ink">ตรวจสอบก่อนส่ง</h2>

            <div className="mt-3 rounded-md border border-line bg-surface p-3">
              <span className="rounded bg-status-approved-soft px-2 py-1 text-11 font-medium text-status-approved-ink">ใช้สิทธิ์ได้</span>
              <dl className="mt-3 space-y-3 text-13">
                <div>
                  <dt className="text-12 text-muted">พนักงานผู้รับสิทธิ์</dt>
                  <dd className="mt-1 font-medium text-ink">{employee.name} · {employee.id}</dd>
                  <dd className="mt-0.5 text-12 text-muted">{employee.department}</dd>
                </div>
                <div className="border-t border-line pt-3">
                  <dt className="text-12 text-muted">สิทธิ์สวัสดิการ</dt>
                  <dd className="mt-1 font-medium text-ink">{benefit.name}</dd>
                </div>
                {summaryItems.map((item) => (
                  <div key={item.label} className="flex items-start justify-between gap-3">
                    <dt className="text-12 text-muted">{item.label}</dt>
                    <dd className="text-right text-12 font-semibold tabular-nums text-ink">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mt-4 rounded-md border border-line p-3 text-12 leading-5 text-ink-soft">
              <h3 className="font-semibold text-ink">เงื่อนไขการยื่นแทน</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>ตรวจสอบข้อมูลพนักงานและวงเงินก่อนส่งคำขอ</li>
                <li>แนบหลักฐานการเบิกให้ครบถ้วนและอ่านได้ชัดเจน</li>
                <li>ผู้ยื่นต้องได้รับอนุญาตจากพนักงานผู้รับสิทธิ์</li>
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-line bg-white p-4">
            <h2 className="text-13 font-semibold text-ink">การพิจารณาคำขอ</h2>
            <ol className="mt-3 space-y-3 text-12 text-ink-soft">
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 font-medium text-ink">1</span>
                หัวหน้างานส่งคำขอและเอกสาร
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 font-medium text-ink-soft">2</span>
                ฝ่ายบุคคลตรวจสอบสิทธิ์และหลักฐาน
              </li>
              <li className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-50 font-medium text-ink-soft">3</span>
                แจ้งผลการพิจารณาในเมนูติดตามสถานะ
              </li>
            </ol>
          </section>
        </aside>
      </div>

      <footer className="mt-5 border-t border-line pt-3 text-12 text-muted">
        หากพบข้อมูลสิทธิ์ไม่ถูกต้อง โปรดติดต่อฝ่ายบุคคลก่อนส่งคำขอ
      </footer>
    </div>
  );
}
