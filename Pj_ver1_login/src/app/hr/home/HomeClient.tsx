"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HrEmployee } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import { StatusTabs } from "../StatusTabs";
import { pendingRequests as initialRequests, type PendingRequest } from "../sample/pending";
import { ALL, filtersToQuery, replaceUrlQuery, type RequestFilters } from "../urlFilters";

type RequestAction = "approve" | "reject" | "return";

/**
 * เหตุที่ยังอนุมัติไม่ได้ เรียงตามความสำคัญ (ข้อแรกกำหนดการกระทำที่แนะนำ)
 * action = null หมายถึงผู้ที่เข้าระบบไม่ควรตัดสินคำขอนี้เอง
 */
type Blocker = { message: string; action: Exclude<RequestAction, "approve"> | null; reason: string };

type QueueRow = PendingRequest & {
  employee: HrEmployee | null;
  name: string;
  blockers: Blocker[];
  /** วงเงินคงเหลือหลังอนุมัติ (null = ไม่ใช่คำขอเบิก) */
  remainingAfter: number | null;
  waitingDays: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** คำขอที่รอตั้งแต่จำนวนวันนี้ขึ้นไปถือว่าเกินกำหนด */
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

/**
 * ทุกเหตุที่อนุมัติไม่ได้ (ไม่ใช่แค่ข้อแรก) เพื่อให้ HR เห็นครบในครั้งเดียว
 * นโยบาย: ผู้ที่ลาออก/เสียชีวิต หรือไม่ใช่พนักงานของบริษัท เบิกไม่ได้ทุกกรณี
 */
function findBlockers(request: PendingRequest, employee: HrEmployee | null, remainingAfter: number | null, viewerCode: string | null): Blocker[] {
  const blockers: Blocker[] = [];
  if (!employee) {
    blockers.push({
      message: "ไม่พบรหัสพนักงานนี้ในระบบ จึงไม่มีสิทธิ์เบิก",
      action: "reject",
      reason: "ไม่พบผู้ยื่นในรายชื่อพนักงานของบริษัท จึงไม่มีสิทธิ์รับสวัสดิการ",
    });
  } else if (employee.status !== "ACTIVE") {
    const since = employee.statusDate ? ` ตั้งแต่ ${formatThaiDate(employee.statusDate)}` : "";
    blockers.push({
      message: `พนักงาน${employee.statusLabel}${since} จึงไม่มีสิทธิ์เบิก`,
      action: "reject",
      reason: `ผู้ยื่นมีสถานะ${employee.statusLabel}${since} ไม่ได้เป็นพนักงานของบริษัทแล้ว จึงไม่มีสิทธิ์รับสวัสดิการ`,
    });
  }
  if (viewerCode && request.employeeCode === viewerCode) {
    blockers.push({
      message: "เป็นคำขอของคุณเอง ต้องให้เจ้าหน้าที่คนอื่นเป็นผู้ตัดสิน",
      action: null,
      reason: "",
    });
  }
  if (remainingAfter !== null && remainingAfter < 0) {
    blockers.push({
      message: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remainingAfter)} บาท`,
      action: "return",
      reason: `ยอดเบิกเกินวงเงินคงเหลือ ${baht.format(-remainingAfter)} บาท กรุณาปรับยอดเบิกไม่เกิน ${baht.format(request.limit - request.used)} บาท`,
    });
  }
  if (request.itemType === "benefit" && (request.attachments?.length ?? 0) === 0) {
    blockers.push({
      message: "ไม่มีใบเสร็จหรือเอกสารประกอบ",
      action: "return",
      reason: "กรุณาแนบใบเสร็จหรือเอกสารประกอบการเบิก",
    });
  }
  return blockers;
}

function toRow(request: PendingRequest, byCode: Map<string, HrEmployee>, today: string, viewerCode: string | null): QueueRow {
  const employee = byCode.get(request.employeeCode) ?? null;
  const remainingAfter = request.itemType === "benefit" ? request.limit - request.used - request.amount : null;
  return {
    ...request,
    employee,
    name: employee?.name ?? request.fallbackName,
    blockers: findBlockers(request, employee, remainingAfter, viewerCode),
    remainingAfter,
    waitingDays: daysBetween(request.submitted, today),
  };
}

/** การกระทำที่แนะนำ: ข้อแรกที่ระบุการกระทำไว้ (null = ไม่ควรตัดสินเอง) */
function suggestedAction(row: QueueRow): Blocker["action"] {
  if (row.blockers.some((blocker) => blocker.action === null)) return null;
  return row.blockers[0]?.action ?? null;
}

/** เหตุผลตั้งต้นของการกระทำนั้น รวมทุกข้อที่ตรงกัน */
function prefillReason(row: QueueRow, action: RequestAction) {
  return row.blockers.filter((blocker) => blocker.action === action).map((blocker) => blocker.reason).join(" และ ");
}

export function HomeClient({
  employees,
  viewerCode,
  initialFilters,
}: {
  employees: HrEmployee[] | null;
  viewerCode: string | null;
  initialFilters: RequestFilters;
}) {
  const [query, setQuery] = useState(initialFilters.q);
  const [department, setDepartment] = useState(initialFilters.dept);
  const [itemType, setItemType] = useState(initialFilters.type);
  const [pending, setPending] = useState(initialRequests);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [decision, setDecision] = useState<{ rows: QueueRow[]; action: RequestAction } | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [lastDone, setLastDone] = useState<{ removed: { request: PendingRequest; index: number }[]; message: string } | null>(null);
  const [undoPaused, setUndoPaused] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  /** แถวที่ควรได้โฟกัสต่อหลังตัดสินใจเสร็จ (null = หัวเรื่อง, undefined = ไม่ต้องย้าย) */
  const focusNextRef = useRef<string | null | undefined>(undefined);

  const filterQuery = filtersToQuery({ q: query, dept: department, type: itemType });

  // เก็บตัวกรองไว้ใน URL ให้คงอยู่เมื่อสลับแท็บ กดย้อนกลับ หรือส่งลิงก์ต่อ
  useEffect(() => {
    replaceUrlQuery(filterQuery);
  }, [filterQuery]);

  const rows = useMemo(() => {
    const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
    const today = todayIso();
    // คิวเรียงจากรอนานที่สุดก่อน
    return pending.map((request) => toRow(request, byCode, today, viewerCode)).sort((a, b) => b.waitingDays - a.waitingDays);
  }, [employees, pending, viewerCode]);

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
        (department === ALL || row.employee?.department === department || row.employee?.parentDepartment === department) &&
        (itemType === ALL || row.itemType === itemType)
      );
    });
  }, [department, itemType, query, rows]);

  // คำขอที่ต้องตรวจสอบก่อนอยู่กลุ่มบนสุด เพื่อไม่ให้ปะปนกับคำขอที่อนุมัติได้ทันที
  const blockedRows = filteredRows.filter((row) => row.blockers.length > 0);
  const readyRows = filteredRows.filter((row) => row.blockers.length === 0);
  const groups = [
    { id: "blocked", label: "ต้องตรวจสอบก่อน", rows: blockedRows },
    { id: "ready", label: "พร้อมอนุมัติ", rows: readyRows },
  ].filter((group) => group.rows.length > 0);
  const visibleOrder = groups.flatMap((group) => group.rows);

  // อนุมัติหลายรายการได้เฉพาะคำขอเบิกที่พร้อมอนุมัติ คำขอแก้ไขข้อมูลต้องดูหลักฐานทีละรายการ
  const bulkCandidates = readyRows.filter((row) => row.itemType === "benefit");
  const selectedRows = bulkCandidates.filter((row) => selectedIds.includes(row.id));
  const allBulkSelected = bulkCandidates.length > 0 && selectedRows.length === bulkCandidates.length;

  const overdueCount = rows.filter((row) => row.waitingDays >= OVERDUE_DAYS).length;
  const blockedCount = rows.filter((row) => row.blockers.length > 0).length;
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
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, textarea, a[href], input, select"))
        .filter((element) => !element.hasAttribute("disabled"));
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

  // ปุ่มเลิกทำไม่หมดเวลาขณะผู้ใช้ชี้เมาส์หรือโฟกัสอยู่ที่ข้อความ (WCAG 2.2.1)
  useEffect(() => {
    if (!lastDone || undoPaused) return;
    const timer = window.setTimeout(() => setLastDone(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastDone, undoPaused]);

  function openDecision(targetRows: QueueRow[], action: RequestAction, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setDecision({ rows: targetRows, action });
    setReason(targetRows.length === 1 ? prefillReason(targetRows[0], action) : "");
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
    const ids = new Set(decision.rows.map((row) => row.id));
    const lastPosition = Math.max(...decision.rows.map((row) => visibleOrder.findIndex((item) => item.id === row.id)));
    const remaining = visibleOrder.filter((row) => !ids.has(row.id));
    const next = visibleOrder.slice(lastPosition + 1).find((row) => !ids.has(row.id)) ?? remaining[remaining.length - 1] ?? null;
    focusNextRef.current = next?.id ?? null;

    const removed = pending
      .map((request, index) => ({ request, index }))
      .filter(({ request }) => ids.has(request.id));
    setPending((current) => current.filter((item) => !ids.has(item.id)));
    setSelectedIds((current) => current.filter((id) => !ids.has(id)));
    const subject = decision.rows.length === 1
      ? `คำขอ ${decision.rows[0].id} ของ ${decision.rows[0].name}`
      : `คำขอ ${decision.rows.length} รายการ`;
    setLastDone({
      removed,
      // ข้อมูลยังเป็นตัวอย่าง จึงบอกตามจริงว่ายังไม่ได้บันทึก
      message: `(ตัวอย่าง) ${ACTION_COPY[decision.action].done}${subject}แล้ว ยังไม่ได้บันทึกลงระบบ`,
    });
    setUndoPaused(false);
    setDecision(null);
    setReason("");
    setReasonError("");
    triggerRef.current = null;
  }

  function undo() {
    if (!lastDone) return;
    focusNextRef.current = lastDone.removed[0]?.request.id ?? null;
    setPending((current) => {
      const next = [...current];
      for (const { request, index } of [...lastDone.removed].sort((a, b) => a.index - b.index)) {
        next.splice(Math.min(index, next.length), 0, request);
      }
      return next;
    });
    setLastDone(null);
  }

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setItemType(ALL);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function renderActions(row: QueueRow) {
    if (row.blockers.length > 0) {
      const primary = suggestedAction(row);
      if (primary === null) {
        return <span className="queue-meta">รอเจ้าหน้าที่คนอื่น</span>;
      }
      const secondary: RequestAction = primary === "reject" ? "return" : "reject";
      return (
        <>
          <button
            type="button"
            data-primary-action
            className={`queue-primary${primary === "reject" ? " queue-primary-danger" : ""}`}
            onClick={(event) => openDecision([row], primary, event.currentTarget)}
            aria-label={`${ACTION_COPY[primary].done}คำขอ ${row.id} ของ ${row.name}`}
            aria-describedby={`blockers-${row.id}`}
          >
            {ACTION_COPY[primary].done}
          </button>
          <button
            type="button"
            className={`queue-secondary${secondary === "reject" ? " queue-danger" : ""}`}
            onClick={(event) => openDecision([row], secondary, event.currentTarget)}
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
          onClick={(event) => openDecision([row], "approve", event.currentTarget)}
          aria-label={`อนุมัติคำขอ ${row.id} ของ ${row.name}`}
        >
          อนุมัติ
        </button>
        <button type="button" className="queue-secondary" onClick={(event) => openDecision([row], "return", event.currentTarget)} aria-label={`ส่งกลับคำขอ ${row.id} ให้แก้ไข`}>
          ส่งกลับ
        </button>
        <button type="button" className="queue-secondary queue-danger" onClick={(event) => openDecision([row], "reject", event.currentTarget)} aria-label={`ปฏิเสธคำขอ ${row.id}`}>
          ปฏิเสธ
        </button>
      </>
    );
  }

  const single = decision && decision.rows.length === 1 ? decision.rows[0] : null;
  const bulkTotal = decision ? decision.rows.reduce((sum, row) => sum + row.amount, 0) : 0;

  return (
    <>
      <div className="page-content queue-page" inert={decision ? true : undefined}>
        <header className="queue-heading">
          <h1 ref={headingRef} tabIndex={-1}>คำขอรออนุมัติ</h1>
          <ul className="queue-summary" suppressHydrationWarning>
            <li>{todayLabel()}</li>
            <li>รอตรวจ {rows.length} รายการ</li>
            {overdueCount > 0 ? <li className="queue-overdue-text">รอ {OVERDUE_DAYS} วันขึ้นไป {overdueCount} รายการ</li> : null}
            {blockedCount > 0 ? <li>ต้องตรวจสอบก่อน {blockedCount} รายการ</li> : null}
          </ul>
        </header>

        <StatusTabs active="home" pendingCount={pending.length} query={filterQuery} />

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

          {selectedRows.length > 0 ? (
            <div className="queue-bulkbar" role="region" aria-label="ดำเนินการกับรายการที่เลือก">
              <span>เลือก {selectedRows.length} รายการ · รวม {baht.format(selectedRows.reduce((sum, row) => sum + row.amount, 0))} บาท</span>
              <button type="button" className="queue-primary" onClick={(event) => openDecision(selectedRows, "approve", event.currentTarget)}>
                อนุมัติที่เลือก
              </button>
              <button type="button" className="queue-link-button" onClick={() => setSelectedIds([])}>ยกเลิกการเลือก</button>
            </div>
          ) : null}

          <div className="queue-table-scroll">
            <table className="queue-table">
              <thead>
                <tr>
                  <th scope="col" className="queue-check">
                    {bulkCandidates.length > 0 ? (
                      <input
                        type="checkbox"
                        checked={allBulkSelected}
                        onChange={() => setSelectedIds(allBulkSelected ? [] : bulkCandidates.map((row) => row.id))}
                        aria-label="เลือกคำขอเบิกที่พร้อมอนุมัติทั้งหมด"
                      />
                    ) : <span className="sr-only">เลือก</span>}
                  </th>
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
                    <th scope="colgroup" colSpan={6}>
                      {group.label} <span className="queue-group-count">{group.rows.length}</span>
                    </th>
                  </tr>
                  {group.rows.map((row) => {
                    const bulkable = row.blockers.length === 0 && row.itemType === "benefit";
                    return (
                      <tr key={row.id} data-row-id={row.id} className={row.blockers.length > 0 ? "queue-row-blocked" : undefined}>
                        <td className="queue-check">
                          {bulkable ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(row.id)}
                              onChange={() => toggleSelected(row.id)}
                              aria-label={`เลือกคำขอ ${row.id} ของ ${row.name}`}
                            />
                          ) : null}
                        </td>
                        <td data-label="พนักงาน">
                          {row.employee ? (
                            <Link className="queue-name queue-name-link" href={`/hr/employees/${encodeURIComponent(row.employeeCode)}`}>{row.name}</Link>
                          ) : <span className="queue-name">{row.name}</span>}
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
                          {row.blockers.length > 0 ? (
                            <ul className="queue-blocker" id={`blockers-${row.id}`}>
                              {row.blockers.map((blocker) => <li key={blocker.message}>{blocker.message}</li>)}
                            </ul>
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
                    );
                  })}
                </tbody>
              ))}
              {filteredRows.length === 0 ? (
                <tbody>
                  <tr>
                    <td className="queue-empty" colSpan={6}>
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
      </div>

      {decision ? (
        <div
          className="decision-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDecision();
          }}
        >
          <section
            ref={dialogRef}
            className="decision-dialog queue-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            aria-describedby={single && single.blockers.length > 0 ? "decision-blockers" : undefined}
          >
            <button type="button" className="decision-close" onClick={closeDecision} aria-label="ปิดหน้าต่าง">×</button>
            <h2 id="decision-title">
              {ACTION_COPY[decision.action].title}{decision.rows.length > 1 ? ` ${decision.rows.length} รายการ` : ""}
            </h2>

            {single && single.blockers.length > 0 ? (
              <div className="queue-dialog-blockers" id="decision-blockers">
                <strong>เหตุที่อนุมัติไม่ได้</strong>
                <ul>{single.blockers.map((blocker) => <li key={blocker.message}>{blocker.message}</li>)}</ul>
              </div>
            ) : null}

            {single ? (
              <>
                <dl className="queue-facts">
                  <div><dt>คำขอ</dt><dd>{single.id} · {single.benefit}</dd></div>
                  <div><dt>พนักงาน</dt><dd>{single.name} ({single.employeeCode}){single.employee ? ` · ${single.employee.statusLabel}` : ""}</dd></div>
                  {single.employee?.department ? <div><dt>แผนก</dt><dd>{single.employee.department}</dd></div> : null}
                  {single.itemType === "benefit" ? (
                    <>
                      <div><dt>ยอดเบิก</dt><dd className="queue-num">{baht.format(single.amount)} บาท</dd></div>
                      <div><dt>ใช้ไปแล้ว</dt><dd className="queue-num">{baht.format(single.used)} จาก {baht.format(single.limit)} บาท</dd></div>
                      <div><dt>คงเหลือหลังอนุมัติ</dt><dd className="queue-num">{baht.format(single.remainingAfter ?? 0)} บาท</dd></div>
                    </>
                  ) : null}
                </dl>

                {single.changes && single.changes.length > 0 ? (
                  <table className="queue-changes">
                    <caption>ข้อมูลที่ขอแก้ไข</caption>
                    <thead>
                      <tr><th scope="col">รายการ</th><th scope="col">ข้อมูลเดิม</th><th scope="col">ข้อมูลใหม่</th></tr>
                    </thead>
                    <tbody>
                      {single.changes.map((change) => (
                        <tr key={change.field}>
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
                  {single.attachments && single.attachments.length > 0 ? (
                    <ul>
                      {single.attachments.map((file) => (
                        <li key={file.name}>{file.name} <span className="queue-meta-inline">{file.size}</span></li>
                      ))}
                    </ul>
                  ) : <p className="queue-meta-danger">ไม่มีเอกสารแนบ</p>}
                  <p className="queue-meta">ไฟล์ตัวอย่าง ยังเปิดดูไม่ได้จนกว่าจะเชื่อมระบบจัดเก็บเอกสาร</p>
                </div>
              </>
            ) : (
              <table className="queue-changes">
                <caption>คำขอที่จะอนุมัติ · รวม {baht.format(bulkTotal)} บาท</caption>
                <thead>
                  <tr><th scope="col">คำขอ</th><th scope="col">พนักงาน</th><th scope="col" className="queue-num">ยอดเบิก</th></tr>
                </thead>
                <tbody>
                  {decision.rows.map((row) => (
                    <tr key={row.id}>
                      <th scope="row">{row.id} · {row.benefit}</th>
                      <td>{row.name}</td>
                      <td className="queue-num">{baht.format(row.amount)} บาท</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

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
                  {ACTION_COPY[decision.action].confirm}{decision.rows.length > 1 ? ` ${decision.rows.length} รายการ` : ""}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {lastDone ? (
        <div
          className="toast queue-toast"
          role="status"
          onMouseEnter={() => setUndoPaused(true)}
          onMouseLeave={() => setUndoPaused(false)}
          onFocus={() => setUndoPaused(true)}
          onBlur={() => setUndoPaused(false)}
        >
          <span>{lastDone.message}</span>
          <button type="button" className="queue-undo" onClick={undo}>เลิกทำ</button>
          <button type="button" onClick={() => setLastDone(null)} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </>
  );
}
