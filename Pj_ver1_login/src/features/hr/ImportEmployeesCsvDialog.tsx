"use client";

import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from "react";
import { CircleAlert, CircleCheck, FileDown, FileSpreadsheet, FileUp, Info, X } from "lucide-react";
import { Badge, Button } from "@/features/hr/ui";
import { isCsvFile, downloadCsv } from "@/lib/csv";
import { cx } from "@/lib/cx";
import type { OrgOptions } from "@/lib/auth/users";
import {
  buildEmployeeCsvTemplate,
  EMPLOYEE_CSV_COLUMNS,
  EMPLOYEE_CSV_HEADERS,
  MAX_CSV_FILE_BYTES,
  MAX_CSV_IMPORT_ROWS,
  parseEmployeeCsvText,
  type CsvRowPreview,
  type EmployeeCsvRowInput,
} from "@/lib/hr/employeeCsv";

export interface CreatedCsvEmployee {
  code: string;
  name: string;
}

interface PreviewResponse {
  ok: boolean;
  validCount: number;
  invalidCount: number;
  results: CsvRowPreview[];
  error?: string;
}

interface ImportEmployeesCsvDialogProps {
  open: boolean;
  orgOptions?: OrgOptions;
  onClose: () => void;
  onImported: (created: CreatedCsvEmployee[]) => void;
}

const EMPTY_ORG: OrgOptions = { departments: [], positions: [], jobLevels: [] };

async function readCsvFileText(file: File): Promise<{ text: string; error?: string }> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  let text = utf8;
  if (utf8.includes("\uFFFD")) {
    try {
      const win874 = new TextDecoder("windows-874", { fatal: false }).decode(buffer);
      if (!win874.includes("\uFFFD")) {
        text = win874;
      } else {
        return {
          text: "",
          error: "ไม่สามารถอ่านอักขระภาษาไทยในไฟล์ได้ กรุณาบันทึกไฟล์เป็น CSV UTF-8 แล้วอัปโหลดใหม่",
        };
      }
    } catch {
      return {
        text: "",
        error: "ไม่สามารถอ่านอักขระภาษาไทยในไฟล์ได้ กรุณาบันทึกไฟล์เป็น CSV UTF-8 แล้วอัปโหลดใหม่",
      };
    }
  }
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) {
    return {
      text: "",
      error: "ไฟล์นี้ไม่ใช่ไฟล์ข้อความ .csv ที่ถูกต้อง (หากเป็นไฟล์ Excel กรุณาบันทึกเป็น CSV UTF-8 ก่อนอัปโหลด)",
    };
  }
  return { text };
}

export function ImportEmployeesCsvDialog({
  open,
  orgOptions,
  onClose,
  onImported,
}: ImportEmployeesCsvDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const [fetchedOrg, setFetchedOrg] = useState<OrgOptions>(EMPTY_ORG);
  const [sampleManagerCode, setSampleManagerCode] = useState("");
  const [orgLoadError, setOrgLoadError] = useState("");

  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [parsedRows, setParsedRows] = useState<EmployeeCsvRowInput[]>([]);
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [createdList, setCreatedList] = useState<CreatedCsvEmployee[] | null>(null);

  const activeOrg = useMemo(
    () => (orgOptions && orgOptions.departments.length > 0 ? orgOptions : fetchedOrg),
    [orgOptions, fetchedOrg],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const needsOrg = !orgOptions || orgOptions.departments.length === 0;
    if (!needsOrg && sampleManagerCode) return;

    fetch("/api/hr/employees")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load failed"))))
      .then((data: OrgOptions & { managers?: { id: string }[] }) => {
        if (!active) return;
        setOrgLoadError("");
        if (needsOrg) {
          setFetchedOrg({
            departments: data.departments ?? [],
            positions: data.positions ?? [],
            jobLevels: data.jobLevels ?? [],
          });
        }
        if (data.managers?.[0]?.id) {
          setSampleManagerCode(data.managers[0].id);
        }
      })
      .catch(() => {
        if (active && needsOrg) {
          setOrgLoadError("โหลดรายการแผนกและตำแหน่งจากระบบไม่สำเร็จ กรุณาลองปิดแล้วเปิดหน้าต่างใหม่อีกครั้ง");
        }
      });

    return () => {
      active = false;
    };
  }, [open, orgOptions, sampleManagerCode]);

  const resetPickerState = () => {
    setFileName("");
    setFileError("");
    setParsedRows([]);
    setPreview(null);
    setOnlyErrors(false);
    setSubmitError("");
    setCreatedList(null);
  };

  const handleClose = () => {
    if (checking || submitting) return;
    resetPickerState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    const rows = buildEmployeeCsvTemplate(activeOrg, sampleManagerCode);
    downloadCsv("employee-import-template.csv", EMPLOYEE_CSV_HEADERS, rows);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCreatedList(null);
    setSubmitError("");
    setPreview(null);
    setParsedRows([]);
    setOnlyErrors(false);

    if (!isCsvFile(file)) {
      setFileName(file.name);
      setFileError(`ไม่รองรับไฟล์ "${file.name}" กรุณาเลือกไฟล์ .csv เท่านั้น`);
      return;
    }

    if (file.size === 0) {
      setFileName(file.name);
      setFileError("ไฟล์ CSV ที่เลือกไม่มีข้อมูล");
      return;
    }

    if (file.size > MAX_CSV_FILE_BYTES) {
      setFileName(file.name);
      setFileError(`ไฟล์ขนาดใหญ่เกินไป (จำกัดไม่เกิน ${Math.round(MAX_CSV_FILE_BYTES / (1024 * 1024))} MB)`);
      return;
    }

    setFileName(file.name);
    setFileError("");

    const read = await readCsvFileText(file);
    if (read.error) {
      setFileError(read.error);
      return;
    }

    const parsed = parseEmployeeCsvText(read.text);
    if (!parsed.ok) {
      setFileError(parsed.error);
      return;
    }

    setParsedRows(parsed.rows);
    setChecking(true);

    try {
      const res = await fetch("/api/hr/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows, dryRun: true }),
      });
      const result = (await res.json().catch(() => ({}))) as PreviewResponse & { error?: string };
      if (!res.ok || !Array.isArray(result.results)) {
        setFileError(result.error || "ตรวจสอบข้อมูลในไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง");
      } else {
        setPreview(result);
        if (result.invalidCount > 0) setOnlyErrors(false);
      }
    } catch {
      setFileError("เชื่อมต่อเซิร์ฟเวอร์เพื่อตรวจสอบไฟล์ไม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setChecking(false);
    }
  };

  const handleConfirmImport = async () => {
    if (submitting || checking || !preview || preview.invalidCount > 0 || parsedRows.length === 0) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/hr/employees/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsedRows, dryRun: false }),
      });
      const result = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        created?: CreatedCsvEmployee[];
        results?: CsvRowPreview[];
        validCount?: number;
        invalidCount?: number;
      };

      if (!res.ok) {
        if (Array.isArray(result.results)) {
          setPreview({
            ok: false,
            validCount: result.validCount ?? 0,
            invalidCount: result.invalidCount ?? result.results.filter((r) => !r.valid).length,
            results: result.results,
          });
        }
        setSubmitError(result.error || "นำเข้าข้อมูลพนักงานไม่สำเร็จ ข้อมูลทั้งหมดยังไม่เข้าระบบ");
        return;
      }

      const created = result.created ?? [];
      setCreatedList(created);
      onImported(created);
    } catch {
      setSubmitError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ข้อมูลทั้งหมดยังไม่เข้าระบบ กรุณาลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  };

  const requiredCols = useMemo(() => EMPLOYEE_CSV_COLUMNS.filter((c) => c.required), []);
  const optionalCols = useMemo(() => EMPLOYEE_CSV_COLUMNS.filter((c) => !c.required), []);

  const visibleRows = useMemo(() => {
    if (!preview) return [];
    return onlyErrors ? preview.results.filter((row) => !row.valid) : preview.results;
  }, [preview, onlyErrors]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-24px)] max-w-[920px] overflow-y-auto rounded-[12px] border border-line bg-white p-0 text-ink shadow-lg backdrop:bg-ink/45"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3.5">
          <div className="flex items-start gap-3">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-50 text-primary-600">
              <FileSpreadsheet className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id={titleId} className="text-17 font-semibold text-ink">
                นำเข้าข้อมูลพนักงานผ่านไฟล์ CSV
              </h2>
              <p className="mt-0.5 text-13 text-muted">
                เพิ่มพนักงานหลายคนพร้อมกัน ระบบจะตรวจสอบข้อมูลทุกแถวก่อนบันทึก และออกรหัสพนักงาน (E000xx) ให้อัตโนมัติ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={checking || submitting}
            aria-label="ปิดหน้าต่าง"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink disabled:opacity-40"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* เงื่อนไขและข้อกำหนดไฟล์ CSV */}
        <section className="flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-4">
          <div className="flex items-center gap-2 text-14 font-semibold text-ink">
            <Info className="size-4 shrink-0 text-primary-600" aria-hidden="true" />
            <span>เงื่อนไขและข้อกำหนดของไฟล์ CSV</span>
          </div>

          <ul className="list-disc space-y-1 pl-5 text-13 text-ink-soft">
            <li>
              ใช้ไฟล์นามสกุล <strong className="font-semibold text-ink">.csv (แนะนำบันทึกแบบ CSV UTF-8)</strong> ขนาดไม่เกิน{" "}
              <strong className="font-semibold text-ink">2 MB</strong> และนำเข้าได้สูงสุด{" "}
              <strong className="font-semibold text-ink">{MAX_CSV_IMPORT_ROWS} คนต่อไฟล์</strong>
            </li>
            <li>
              ระบบสร้าง <strong className="font-semibold text-ink">รหัสพนักงาน (E000xx)</strong> ให้อัตโนมัติ ไม่ต้องใส่คอลัมน์รหัสพนักงานในไฟล์
            </li>
            <li>
              <strong className="font-semibold text-ink">บันทึกแบบทั้งหมดหรือยกเลิกทั้งหมด:</strong>{" "}
              หากพบข้อผิดพลาดแม้แต่แถวเดียว ระบบจะแสดงรายการเพื่อให้แก้ไขก่อน และยังไม่บันทึกพนักงานคนใดเข้าสู่ระบบ
            </li>
            <li>
              วันที่ (<strong className="font-semibold text-ink">วันเกิด / วันเริ่มงาน</strong>) ต้องใช้รูปแบบ{" "}
              <code className="rounded bg-white px-1.5 py-0.5 text-12 ring-1 ring-inset ring-line">YYYY-MM-DD</code>{" "}
              <strong className="font-semibold text-ink">ปี ค.ศ. เท่านั้น</strong> (เช่น <code className="rounded bg-white px-1 py-0.5 text-12 ring-1 ring-inset ring-line">2026-11-01</code>) และวันเกิดต้องอยู่ก่อนวันเริ่มงาน
            </li>
            <li>
              <strong className="font-semibold text-ink">เลขบัตรประชาชน (13 หลัก)</strong> และ{" "}
              <strong className="font-semibold text-ink">อีเมล</strong> ห้ามซ้ำกันเองในไฟล์และห้ามซ้ำกับพนักงานที่มีอยู่แล้วในระบบ
            </li>
            <li>
              การนำเข้า CSV จะสร้างข้อมูลพนักงานในระบบ (ยังไม่สร้างบัญชีล็อกอินให้พนักงาน — ผู้ดูแลระบบออกบัญชีได้ภายหลังที่หน้าตั้งค่าผู้ใช้งานระบบ)
            </li>
          </ul>

          <div className="grid grid-cols-1 gap-3 pt-1 lg:grid-cols-2">
            <div className="rounded-[8px] border border-line bg-white p-3">
              <p className="text-12 font-semibold text-ink">
                คอลัมน์บังคับ ({requiredCols.length} คอลัมน์ — ต้องมีในหัวตารางและห้ามเว้นว่าง)
              </p>
              <dl className="mt-2 space-y-1.5 text-12">
                {requiredCols.map((col) => (
                  <div key={col.key} className="flex flex-wrap gap-x-1.5">
                    <dt className="font-semibold text-ink">{col.header}:</dt>
                    <dd className="text-muted">{col.ruleSummary}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="rounded-[8px] border border-line bg-white p-3">
              <p className="text-12 font-semibold text-ink">
                คอลัมน์เพิ่มเติม ({optionalCols.length} คอลัมน์ — เว้นว่างได้)
              </p>
              <p className="mt-1.5 text-12 leading-relaxed text-muted">
                {optionalCols.map((c) => c.header).join(" · ")}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-12 text-muted">
                <li>
                  <strong className="text-ink">คำนำหน้า:</strong> นาย, นาง, นางสาว, อื่น ๆ หรือเว้นว่าง
                </li>
                <li>
                  <strong className="text-ink">รหัสหัวหน้า:</strong> รหัสพนักงานที่ยังทำงานอยู่ เช่น <code className="rounded bg-surface px-1 text-11">E00014</code>
                </li>
                <li>
                  <strong className="text-ink">รหัสไปรษณีย์:</strong> ถ้ากรอกต้องเป็นตัวเลข 5 หลัก
                </li>
              </ul>
            </div>
          </div>

          <details className="rounded-[8px] border border-line bg-white px-3 py-2 text-12">
            <summary className="cursor-pointer font-semibold text-primary-700 hover:underline">
              ดูรายชื่อ แผนก / ตำแหน่ง / ระดับ ที่เปิดใช้งานในระบบตอนนี้
            </summary>
            {orgLoadError ? (
              <p className="mt-2 text-danger">{orgLoadError}</p>
            ) : (
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 text-12 sm:grid-cols-3">
                <div>
                  <p className="font-semibold text-ink">แผนก ({activeOrg.departments.length})</p>
                  <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto text-muted">
                    {activeOrg.departments.map((d) => (
                      <li key={d.id}>
                        {d.name} {d.code ? <span className="text-11">({d.code})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-ink">ตำแหน่ง ({activeOrg.positions.length})</p>
                  <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto text-muted">
                    {activeOrg.positions.map((p) => (
                      <li key={p.id}>
                        {p.name} {p.code ? <span className="text-11">({p.code})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-ink">ระดับ ({activeOrg.jobLevels.length})</p>
                  <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto text-muted">
                    {activeOrg.jobLevels.map((l) => (
                      <li key={l.id}>
                        {l.name} {l.code ? <span className="text-11">({l.code})</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </details>
        </section>

        {/* แถบดาวน์โหลดตัวอย่าง และเลือกไฟล์ */}
        {!createdList ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="quiet" onClick={handleDownloadTemplate} disabled={checking || submitting}>
              <FileDown className="size-4" aria-hidden="true" />
              ดาวน์โหลดไฟล์ตัวอย่าง CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={checking || submitting}
            >
              <FileUp className="size-4" aria-hidden="true" />
              {checking ? "กำลังตรวจสอบไฟล์…" : fileName ? "เลือกไฟล์ CSV ใหม่" : "เลือกไฟล์ CSV"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => void handleFileChange(event)}
            />
            {fileName ? (
              <span className="text-13 text-muted">
                ไฟล์ที่เลือก: <strong className="font-medium text-ink">{fileName}</strong>
              </span>
            ) : null}
          </div>
        ) : null}

        {fileError ? (
          <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-13 text-[#991B1B]">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{fileError}</span>
          </div>
        ) : null}

        {submitError ? (
          <div role="alert" className="flex items-start gap-2 rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3.5 py-2.5 text-13 text-[#991B1B]">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{submitError}</span>
          </div>
        ) : null}

        {/* ตารางพรีวิวผลการตรวจสอบ */}
        {preview && !createdList ? (
          <section className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-13">
                <span className="font-semibold text-ink">ผลการตรวจสอบ ({preview.results.length} แถว)</span>
                <Badge tone="approved">พร้อมนำเข้า {preview.validCount} คน</Badge>
                {preview.invalidCount > 0 ? (
                  <Badge tone="rejected">พบข้อผิดพลาด {preview.invalidCount} แถว</Badge>
                ) : null}
              </div>

              {preview.invalidCount > 0 ? (
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-12 text-muted">
                  <input
                    type="checkbox"
                    checked={onlyErrors}
                    onChange={(event) => setOnlyErrors(event.target.checked)}
                    className="size-3.5 accent-primary-600"
                  />
                  แสดงเฉพาะแถวที่พบข้อผิดพลาด
                </label>
              ) : null}
            </div>

            <div className="max-h-[260px] overflow-auto rounded-[8px] border border-line">
              <table className="w-full min-w-[680px] border-collapse text-left text-12">
                <thead className="sticky top-0 bg-surface text-muted">
                  <tr className="border-b border-line">
                    <th className="px-3 py-2 font-medium">แถว</th>
                    <th className="px-3 py-2 font-medium">พนักงาน</th>
                    <th className="px-3 py-2 font-medium">แผนก / ตำแหน่ง / ระดับ</th>
                    <th className="px-3 py-2 font-medium">วันเริ่มงาน</th>
                    <th className="px-3 py-2 font-medium">ผลการตรวจสอบ</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={cx(
                        "border-t border-[#F1F5F9] align-top",
                        !row.valid && "bg-[#FEF2F2]/60",
                      )}
                    >
                      <td className="px-3 py-2 font-medium tabular-nums text-muted">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{row.fullName}</div>
                        <div className="text-11 text-muted">{row.email}</div>
                      </td>
                      <td className="px-3 py-2 text-ink-soft">
                        <div>{row.departmentName}</div>
                        <div className="text-11 text-muted">
                          {row.positionName}
                          {row.jobLevelName !== "—" ? ` · ${row.jobLevelName}` : ""}
                          {row.managerLabel !== "—" ? ` · หัวหน้า: ${row.managerLabel}` : ""}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums text-ink-soft">{row.startDate}</td>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <Badge tone="approved">พร้อมนำเข้า</Badge>
                        ) : (
                          <ul className="list-disc space-y-0.5 pl-4 text-[#991B1B]">
                            {row.errors.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* สรุปผลหลังนำเข้าสำเร็จ */}
        {createdList ? (
          <section role="status" className="flex flex-col gap-3 rounded-[10px] border border-[#BBF7D0] bg-[#F0FDF4] p-4">
            <div className="flex items-center gap-2 text-15 font-semibold text-[#166534]">
              <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
              <span>นำเข้าพนักงานสำเร็จ {createdList.length} คน</span>
            </div>
            <p className="text-13 text-[#166534]">
              ระบบสร้างรหัสพนักงานและบันทึกประวัติการทำงานเรียบร้อยแล้ว
            </p>
            <div className="max-h-48 overflow-y-auto rounded-[8px] border border-[#BBF7D0] bg-white p-3">
              <ul className="grid grid-cols-1 gap-1.5 text-13 sm:grid-cols-2">
                {createdList.map((item) => (
                  <li key={item.code} className="flex items-center gap-2">
                    <span className="rounded bg-primary-50 px-2 py-0.5 font-mono text-12 font-semibold text-primary-700">
                      {item.code}
                    </span>
                    <span className="truncate text-ink">{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}

        {/* ปุ่มท้ายหน้าต่าง */}
        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3.5">
          {createdList ? (
            <Button variant="primary" onClick={handleClose}>
              เสร็จสิ้น
            </Button>
          ) : (
            <>
              <Button variant="quiet" onClick={handleClose} disabled={checking || submitting}>
                ยกเลิก
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleConfirmImport()}
                disabled={
                  checking ||
                  submitting ||
                  !preview ||
                  preview.validCount === 0 ||
                  preview.invalidCount > 0
                }
              >
                {submitting
                  ? "กำลังบันทึก…"
                  : preview && preview.invalidCount === 0 && preview.validCount > 0
                    ? `ยืนยันนำเข้า ${preview.validCount} คน`
                    : "ยืนยันนำเข้า"}
              </Button>
            </>
          )}
        </footer>
      </div>
    </dialog>
  );
}
