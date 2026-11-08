"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HrEmployee } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import { StatusTabs } from "../StatusTabs";
import { pendingRequests as initialRequests, type PendingRequest } from "../sample/pending";

type RequestAction = "approve" | "reject" | "return";

/** เหตุที่ยังอนุมัติไม่ได้ พร้อมการกระทำที่ควรทำแทน */
type Blocker = { message: string; action: Exclude<RequestAction, "approve">; reason: string };

type QueueRow = PendingRequest & {
  employee: HrEmployee | null;
  name: string;
  blocker: Blocker | null;
  /** วงเงินคงเหลือหลังอนุมัติ (null = ไม่ใช่คำขอเบิก) */
  remainingAfter: number | null;
  waitingDays: number;
};

const ALL = "ทั้งหมด";
const DAY_MS = 24 * 60 * 60 * 1000;
/** คำขอที่รอนานกว่านี้ถือว่าเกินกำหนด */
const OVERDUE_DAYS = 5;
const UNDO_MS = 8000;

const ACTION_COPY: Record<RequestAction, { title: string; confirm: string; done: string }> = {
  approve: { title: "ยืนยันการอนุมัติ", confirm: "ยืนยันอนุมัติ", done: "อนุมัติ" },
  reject: { title: "ปฏิเสธคำขอ", confirm: "ยืนยันปฏิเสธ", done: "ปฏิเสธ" },
  return: { title: "ส่งกลับให้พนักงานแก้ไข", confirm: "ส่งกลับให้แก้ไข", done: "ส่งกลับ" },
};

const baht = new Intl.NumberFormat("th-TH");

function todayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}

function todayLabel() {
  return new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

function daysBetween(fromIso: string, toIso: string) {
  return Math.max(0, Math.round((Date.parse(toIso) - Date.parse(fromIso)) / DAY_MS));
}

function waitingLabel(days: number) {
  return days === 0 ? "ยื่นวันนี้" : `รอ ${days} วัน`;
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function findBlocker(request: PendingRequest, employee: HrEmployee | null, remainingAfter: number | null): Blocker | null {
  if (!employee) {
    return {
      message: "ไม่พบพนักงานรหัสนี้ในระบบ",
      action: "return",
      reason: "ไม่พบรหัสพนักงานในระบบ กรุณาตรวจสอบรหัสพนักงานแล้วยื่นใหม่",
    };
  }
  if (employee.status !== "ACTIVE") {
    const since = employee.statusDate ? ` ตั้งแต่ ${formatThaiDate(employee.statusDate)}` : "";
    return {
      message: `พนักงาน${employee.statusLabel}${since} จึงไม่มีสิทธิ์เบิก`,
      action: "reject",
      reason: `ผู้ยื่นมีสถานะ${employee.statusLabel}${since} จึงไม่มีสิทธิ์รับสวัสดิการ`,
    };
  }
  if (remainingAfter !== null && remainingAfter < 0) {
    return {
      message: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remainingAfter)} บาท`,
      action: "return",
      reason: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remainingAfter)} บาท กรุณาปรับยอดเบิกไม่เกิน ${baht.format(request.limit - request.used)} บาท`,
    };
  }
  if (request.itemType === "benefit" && (request.attachments?.length ?? 0) === 0) {
    return {
      message: "ไม่มีใบเสร็จหรือเอกสารประกอบ",
      action: "return",
      reason: "กรุณาแนบใบเสร็จหรือเอกสารประกอบการเบิก",
    };
  }
  return null;
}

function toRow(request: PendingRequest, byCode: Map<string, HrEmployee>, today: string): QueueRow {
  const employee = byCode.get(request.employeeCode) ?? null;
  const remainingAfter = request.itemType === "benefit" ? request.limit - request.used - request.amount : null;
  return {
    ...request,
    employee,
    name: employee?.name ?? request.fallbackName,
    blocker: findBlocker(request, employee, remainingAfter),
    remainingAfter,
    waitingDays: daysBetween(request.submitted, today),
  };
}

function employeeHref(code: string) {
  return `/hr/employees?q=${encodeURIComponent(code)}`;
}

export function HomeClient({ employees }: { employees: HrEmployee[] | null }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState(ALL);
  const [itemType, setItemType] = useState(ALL);
  const [pending, setPending] = useState(initialRequests);
  const [decision, setDecision] = useState<{ row: QueueRow; action: RequestAction } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [lastDone, setLastDone] = useState<{ request: PendingRequest; index: number; message: string } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  /** แถวที่ควรได้โฟกัสต่อหลังตัดสินใจเสร็จ (null = ไปที่หัวเรื่อง) */
  const focusNextRef = useRef<string | null | undefined>(undefined);

  const rows = useMemo(() => {
    const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
    const today = todayIso();
    // คิวเรียงจากรอนานที่สุดก่อน
    return pending.map((request) => toRow(request, byCode, today)).sort((a, b) => b.waitingDays - a.waitingDays);
  }, [employees, pending]);

  const departments = useMemo(
    () => Array.from(new Set(rows.map((row) => row.employee?.department).filter((name): name is string => Boolean(name)))).sort((a, b) => a.localeCompare(b, "th")),
    [rows],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        `${row.id} ${row.employeeCode} ${row.name} ${row.benefit}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        (department === ALL || row.employee?.department === department) &&
        (itemType === ALL || row.itemType === itemType)
      );
    });
  }, [department, itemType, query, rows]);

  // คำขอที่ต้องตรวจสอบก่อนอยู่กลุ่มบนสุด เพื่อไม่ให้ปะปนกับคำขอที่อนุมัติได้ทันที
  const groups = [
    { id: "blocked", label: "ต้องตรวจสอบก่อน", rows: filteredRows.filter((row) => row.blocker) },
    { id: "ready", label: "พร้อมอนุมัติ", rows: filteredRows.filter((row) => !row.blocker) },
  ].filter((group) => group.rows.length > 0);
  const visibleOrder = groups.flatMap((group) => group.rows);

  const overdueCount = rows.filter((row) => row.waitingDays >= OVERDUE_DAYS).length;
  const blockedCount = rows.filter((row) => row.blocker).length;
  const filtersActive = query !== "" || department !== ALL || itemType !== ALL;

  // ปิดหน้าต่างด้วย Esc, โฟกัสจุดที่ปลอดภัยเมื่อเปิด (ไม่ใช่ปุ่มยืนยัน) และวนโฟกัสอยู่ในหน้าต่าง
  useEffect(() => {
    if (!decision) return;
    const dialog = dialogRef.current;
    const initial = decision.action === "approve"
      ? dialog?.querySelector<HTMLElement>("[data-initial-focus]")
      : dialog?.querySelector<HTMLElement>("textarea");
    initial?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDecision();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, textarea, a[href], input"));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [decision]);

  // หลังแถวหายไป ย้ายโฟกัสไปแถวถัดไป ผู้ใช้คีย์บอร์ดจะไม่หลงตำแหน่ง
  useEffect(() => {
    if (focusNextRef.current === undefined) return;
    const nextId = focusNextRef.current;
    focusNextRef.current = undefined;
    const target = nextId ? document.querySelector<HTMLElement>(`[data-row-id="${nextId}"] [data-primary-action]`) : null;
    (target ?? headingRef.current)?.focus();
  }, [pending]);

  useEffect(() => {
    if (!lastDone) return;
    const timer = window.setTimeout(() => setLastDone(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastDone]);

  function openDecision(row: QueueRow, action: RequestAction, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setDecision({ row, action });
    setReason(row.blocker && row.blocker.action === action ? row.blocker.reason : "");
    setReasonError("");
  }

  function closeDecision() {
    setDecision(null);
    setReason("");
    setReasonError("");
    triggerRef.current?.focus();
  }

  function confirmDecision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!decision) return;
    if (decision.action !== "approve" && !reason.trim()) {
      setReasonError(decision.action === "reject" ? "กรุณาระบุเหตุผลที่ปฏิเสธ" : "กรุณาระบุสิ่งที่พนักงานต้องแก้ไข");
      return;
    }
    const position = visibleOrder.findIndex((row) => row.id === decision.row.id);
    const next = visibleOrder[position + 1] ?? visibleOrder[position - 1] ?? null;
    focusNextRef.current = next?.id ?? null;

    const index = pending.findIndex((request) => request.id === decision.row.id);
    const request = pending[index];
    setPending((current) => current.filter((item) => item.id !== decision.row.id));
    setLastDone({ request, index, message: `${ACTION_COPY[decision.action].done}คำขอ ${decision.row.id} ของ ${decision.row.name} แล้ว` });
    setDecision(null);
    setReason("");
    setReasonError("");
    triggerRef.current = null;
  }

  function undo() {
    if (!lastDone) return;
    const { request, index } = lastDone;
    focusNextRef.current = request.id;
    setPending((current) => {
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, request);
      return next;
    });
    setLastDone(null);
  }

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setItemType(ALL);
  }

  function renderActions(row: QueueRow) {
    if (row.blocker) {
      const primary = row.blocker.action;
      const secondary: RequestAction = primary === "reject" ? "return" : "reject";
      return (
        <>
          <button
            type="button"
            data-primary-action
            className={`queue-primary${primary === "reject" ? " queue-primary-danger" : ""}`}
            onClick={(event) => openDecision(row, primary, event.currentTarget)}
            aria-label={`${ACTION_COPY[primary].done}คำขอ ${row.id} ของ ${row.name} เพราะ${row.blocker.message}`}
          >
            {ACTION_COPY[primary].done}
          </button>
          <button
            type="button"
            className={`queue-secondary${secondary === "reject" ? " queue-danger" : ""}`}
            onClick={(event) => openDecision(row, secondary, event.currentTarget)}
            aria-label={`${ACTION_COPY[secondary].done}คำขอ ${row.id}`}
          >
            {ACTION_COPY[secondary].done}
          </button>
        </>
      );
    }
    return (
      <>
        <button
          type="button"
          data-primary-action
          className="queue-primary"
          onClick={(event) => openDecision(row, "approve", event.currentTarget)}
          aria-label={`อนุมัติคำขอ ${row.id} ของ ${row.name}`}
        >
          อนุมัติ
        </button>
        <button type="button" className="queue-secondary" onClick={(event) => openDecision(row, "return", event.currentTarget)} aria-label={`ส่งกลับคำขอ ${row.id} ให้แก้ไข`}>
          ส่งกลับ
        </button>
        <button type="button" className="queue-secondary queue-danger" onClick={(event) => openDecision(row, "reject", event.currentTarget)} aria-label={`ปฏิเสธคำขอ ${row.id}`}>
          ปฏิเสธ
        </button>
      </>
    );
  }

  const selected = decision?.row;

  return (
    <div className="page-content queue-page">
      <header className="queue-heading">
        <h1 ref={headingRef} tabIndex={-1}>คำขอรออนุมัติ</h1>
        <ul className="queue-summary" suppressHydrationWarning>
          <li>{todayLabel()}</li>
          <li>รอตรวจ {rows.length} รายการ</li>
          {overdueCount > 0 ? <li className="queue-overdue-text">รอเกิน {OVERDUE_DAYS} วัน {overdueCount} รายการ</li> : null}
          {blockedCount > 0 ? <li>ต้องตรวจสอบก่อน {blockedCount} รายการ</li> : null}
        </ul>
      </header>

      <StatusTabs active="home" pendingCount={pending.length} />

      {employees === null ? (
        <p className="queue-alert" role="alert">
          โหลดข้อมูลพนักงานไม่สำเร็จ จึงยังตรวจสถานะและสิทธิ์ของผู้ยื่นไม่ได้{" "}
          <button type="button" className="queue-link-button" onClick={() => window.location.reload()}>ลองโหลดใหม่</button>
        </p>
      ) : null}

      <section className="queue-sheet" aria-label="รายการคำขอรออนุมัติ">
        <div className="queue-filters">
          <label className="queue-search">
            <span className="sr-only">ค้นหาคำขอ</span>
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อ รหัสพนักงาน หรือเลขที่คำขอ"
            />
          </label>
          <label className="queue-select">
            <span>แผนก</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              <option>{ALL}</option>
              {departments.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="queue-select">
            <span>ประเภทคำขอ</span>
            <select value={itemType} onChange={(event) => setItemType(event.target.value)}>
              <option value={ALL}>{ALL}</option>
              <option value="benefit">เบิกสวัสดิการ</option>
              <option value="edit">แก้ไขข้อมูล</option>
            </select>
          </label>
          {filtersActive ? (
            <button type="button" className="queue-link-button" onClick={resetFilters}>ล้างตัวกรอง</button>
          ) : null}
        </div>

        <div className="queue-table-scroll">
          <table className="queue-table">
            <thead>
              <tr>
                <th scope="col">พนักงาน</th>
                <th scope="col">คำขอ</th>
                <th scope="col" className="queue-num">ยอดเบิก</th>
                <th scope="col">ยื่นเมื่อ</th>
                <th scope="col"><span className="sr-only">ดำเนินการ</span></th>
              </tr>
            </thead>
            {groups.map((group) => (
              <tbody key={group.id} className={`queue-group queue-group-${group.id}`}>
                <tr className="queue-group-row">
                  <th scope="colgroup" colSpan={5}>
                    {group.label} <span className="queue-group-count">{group.rows.length}</span>
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.id} data-row-id={row.id} className={row.blocker ? "queue-row-blocked" : undefined}>
                    <td data-label="พนักงาน">
                      <Link className="queue-name queue-name-link" href={employeeHref(row.employeeCode)}>{row.name}</Link>
                      <span className="queue-meta">
                        {row.employeeCode}
                        {row.employee?.department ? ` · ${row.employee.department}` : ""}
                      </span>
                      {row.employee?.manager ? <span className="queue-meta">หัวหน้า: {row.employee.manager.name}</span> : null}
                      {row.employee && row.employee.status !== "ACTIVE" ? (
                        <span className={`employment-status ${row.employee.status.toLowerCase()}`}>{row.employee.statusLabel}</span>
                      ) : null}
                    </td>
                    <td data-label="คำขอ">
                      <span className="queue-item">{row.benefit}</span>
                      <span className="queue-meta">
                        {row.id} · {row.itemType === "edit" ? `แก้ไขข้อมูล ${row.changes?.length ?? 0} รายการ` : `เอกสารแนบ ${row.attachments?.length ?? 0} ไฟล์`}
                      </span>
                      {row.blocker ? (
                        <span className="queue-blocker">
                          {row.blocker.message}
                          {row.employee ? null : <> · <Link href="/hr/employees">ค้นหาในรายชื่อพนักงาน</Link></>}
                        </span>
                      ) : null}
                    </td>
                    <td data-label="ยอดเบิก" className="queue-num">
                      {row.itemType === "benefit" ? (
                        <>
                          <span className="queue-amount">{baht.format(row.amount)} บาท</span>
                          {row.remainingAfter !== null && row.remainingAfter < 0 ? (
                            <span className="queue-meta queue-meta-danger">เกินวงเงิน {baht.format(-row.remainingAfter)} บาท</span>
                          ) : (
                            <span className="queue-meta">คงเหลือ {baht.format(row.remainingAfter ?? 0)} จาก {baht.format(row.limit)} บาท</span>
                          )}
                        </>
                      ) : <span className="queue-meta" aria-label="ไม่มียอดเงิน">—</span>}
                    </td>
                    <td data-label="ยื่นเมื่อ">
                      <span className="queue-date">{formatThaiDate(row.submitted)}</span>
                      <span className={`queue-meta${row.waitingDays >= OVERDUE_DAYS ? " queue-overdue-text" : ""}`}>{waitingLabel(row.waitingDays)}</span>
                    </td>
                    <td className="queue-actions">{renderActions(row)}</td>
                  </tr>
                ))}
              </tbody>
            ))}
            {filteredRows.length === 0 ? (
              <tbody>
                <tr>
                  <td className="queue-empty" colSpan={5}>
                    {rows.length === 0 ? "ไม่มีคำขอรอตรวจแล้ว" : "ไม่พบคำขอที่ตรงกับตัวกรอง"}
                  </td>
                </tr>
              </tbody>
            ) : null}
          </table>
        </div>

        <footer className="queue-footer">
          แสดง {filteredRows.length} จาก {rows.length} รายการ เรียงจากรอนานที่สุด
        </footer>
      </section>

      {decision && selected ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section ref={dialogRef} className="decision-dialog queue-dialog" role="dialog" aria-modal="true" aria-labelledby="decision-title">
            <button type="button" className="decision-close" onClick={closeDecision} aria-label="ปิดหน้าต่าง">×</button>
            <h2 id="decision-title">{ACTION_COPY[decision.action].title}</h2>
            <dl className="queue-facts">
              <div><dt>คำขอ</dt><dd>{selected.id} · {selected.benefit}</dd></div>
              <div><dt>พนักงาน</dt><dd>{selected.name} ({selected.employeeCode}){selected.employee ? ` · ${selected.employee.statusLabel}` : ""}</dd></div>
              {selected.employee?.department ? <div><dt>แผนก</dt><dd>{selected.employee.department}</dd></div> : null}
              {selected.itemType === "benefit" ? (
                <>
                  <div><dt>ยอดเบิก</dt><dd className="queue-num">{baht.format(selected.amount)} บาท</dd></div>
                  <div><dt>ใช้ไปแล้ว</dt><dd className="queue-num">{baht.format(selected.used)} จาก {baht.format(selected.limit)} บาท</dd></div>
                  <div><dt>คงเหลือหลังอนุมัติ</dt><dd className="queue-num">{baht.format(selected.remainingAfter ?? 0)} บาท</dd></div>
                </>
              ) : null}
            </dl>

            {selected.changes && selected.changes.length > 0 ? (
              <table className="queue-changes">
                <caption>ข้อมูลที่ขอแก้ไข</caption>
                <thead>
                  <tr><th scope="col">รายการ</th><th scope="col">ข้อมูลเดิม</th><th scope="col">ข้อมูลใหม่</th></tr>
                </thead>
                <tbody>
                  {selected.changes.map((change) => (
                    <tr key={change.field} className={change.before === change.after ? "queue-change-same" : undefined}>
                      <th scope="row">{change.field}</th>
                      <td>{change.before}</td>
                      <td>{change.before === change.after ? <span className="queue-meta">ไม่เปลี่ยนแปลง</span> : <strong>{change.after}</strong>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}

            <div className="queue-attachments">
              <h3>เอกสารแนบ</h3>
              {selected.attachments && selected.attachments.length > 0 ? (
                <ul>
                  {selected.attachments.map((file) => (
                    <li key={file.name}>{file.name} <span className="queue-meta-inline">{file.size}</span></li>
                  ))}
                </ul>
              ) : <p className="queue-meta-danger">ไม่มีเอกสารแนบ</p>}
              <p className="queue-meta">ไฟล์ตัวอย่าง ยังเปิดดูไม่ได้จนกว่าจะเชื่อมระบบจัดเก็บเอกสาร</p>
            </div>

            <form onSubmit={confirmDecision}>
              {decision.action !== "approve" ? (
                <label className="decision-reason">
                  <span>{decision.action === "reject" ? "เหตุผลที่ปฏิเสธ" : "สิ่งที่พนักงานต้องแก้ไข"} <span className="reason-required">*</span></span>
                  <textarea
                    value={reason}
                    onChange={(event) => {
                      setReason(event.target.value);
                      if (event.target.value.trim()) setReasonError("");
                    }}
                    rows={3}
                    placeholder={decision.action === "reject" ? "เช่น เอกสารไม่ตรงตามเงื่อนไขสวัสดิการ" : "เช่น กรุณาแนบใบเสร็จฉบับเต็ม"}
                    aria-invalid={Boolean(reasonError)}
                    aria-describedby={reasonError ? "decision-reason-error" : undefined}
                    required
                  />
                  {reasonError ? <small id="decision-reason-error" className="decision-error">{reasonError}</small> : null}
                </label>
              ) : null}
              <div className="decision-actions">
                <button type="button" className="button button-secondary" onClick={closeDecision} data-initial-focus>ยกเลิก</button>
                <button
                  type="submit"
                  className={`button ${decision.action === "reject" ? "decision-reject-button" : "queue-confirm-button"}`}
                >
                  {ACTION_COPY[decision.action].confirm}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {lastDone ? (
        <div className="toast queue-toast" role="status">
          <span>{lastDone.message}</span>
          <button type="button" className="queue-undo" onClick={undo}>เลิกทำ</button>
          <button type="button" onClick={() => setLastDone(null)} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </div>
  );
}
