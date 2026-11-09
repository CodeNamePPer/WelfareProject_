"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HrEmployee } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import { StatusTabs } from "../StatusTabs";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import type { HrStatusCounts, PendingRequest } from "@/lib/claims/types";
import { ALL, filtersToQuery, replaceUrlQuery, type QueueView, type RequestFilters } from "../urlFilters";
import { DepartmentOptions, departmentTree, matchesDepartment } from "../departmentTree";
import {
  ACTION_COPY,
  OVERDUE_DAYS,
  baht,
  daysBetween,
  findBlockers,
  remainingAfter,
  requestHref,
  todayIso,
  waitingLabel,
  type Blocker,
  type RequestAction,
} from "./queueRules";

type QueueRow = PendingRequest & {
  employee: HrEmployee | null;
  name: string;
  blockers: Blocker[];
  remainingAfter: number | null;
  waitingDays: number;
};

const UNDO_MS = 8000;

function todayLabel() {
  return new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" });
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></svg>;
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>;
}

function isAction(value: string | null): value is RequestAction {
  return value === "approve" || value === "reject" || value === "return";
}

export function HomeClient({
  employees,
  requests: allRequests,
  counts,
  viewerCode,
  readOnly,
  initialFilters,
  done,
}: {
  employees: HrEmployee[] | null;
  requests: PendingRequest[];
  counts: HrStatusCounts;
  viewerCode: string | null;
  readOnly: boolean;
  initialFilters: RequestFilters;
  /** กลับมาจากหน้ารายละเอียดหลังตัดสินคำขอ: แสดงข้อความยืนยัน */
  done: { id: string; action: string } | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialFilters.q);
  const [department, setDepartment] = useState(initialFilters.dept);
  const [itemType, setItemType] = useState(initialFilters.type);
  const [view, setView] = useState<QueueView>(initialFilters.view);
  // คำขอที่เพิ่งอนุมัติในหน้านี้ ซ่อนจากคิวทันทีระหว่างรอข้อมูลใหม่จาก server
  const [decidedIds, setDecidedIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [lastDone, setLastDone] = useState<{ ids: string[]; message: string } | null>(null);
  const [undoPaused, setUndoPaused] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const restoreFocusRef = useRef(false);

  const filterQuery = filtersToQuery({ q: query, dept: department, type: itemType, view });
  // แท็บอื่นรับตัวกรองต่อ แต่ไม่รับมุมมองของคิว
  const tabQuery = filtersToQuery({ q: query, dept: department, type: itemType }, false);

  useEffect(() => {
    if (done && isAction(done.action)) {
      setLastDone({ ids: [done.id], message: `${ACTION_COPY[done.action].done}คำขอ ${done.id} แล้ว` });
    }
  }, [done]);

  // เก็บตัวกรองไว้ใน URL ให้คงอยู่เมื่อสลับแท็บ กดย้อนกลับ หรือส่งลิงก์ต่อ (และล้าง ?done= ออก)
  useEffect(() => {
    replaceUrlQuery(filterQuery);
  }, [filterQuery]);

  const rows = useMemo(() => {
    const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
    const today = todayIso();
    return allRequests
      .filter((request) => !decidedIds.includes(request.id))
      .map((request): QueueRow => {
        const employee = byCode.get(request.employeeCode) ?? null;
        return {
          ...request,
          employee,
          name: employee?.name ?? request.fallbackName,
          blockers: employees === null ? [] : findBlockers(request, employee, viewerCode),
          remainingAfter: remainingAfter(request),
          waitingDays: daysBetween(request.submitted, today),
        };
      })
      // คิวเรียงจากรอนานที่สุดก่อน
      .sort((a, b) => b.waitingDays - a.waitingDays);
  }, [allRequests, decidedIds, employees, viewerCode]);

  const tree = useMemo(() => departmentTree(rows.map((row) => row.employee)), [rows]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !normalizedQuery ||
        `${row.id} ${row.employeeCode} ${row.name} ${row.benefit} ${row.employee?.department ?? ""}`.toLocaleLowerCase().includes(normalizedQuery);
      return (
        matchesQuery &&
        matchesDepartment(row.employee, department, ALL) &&
        (itemType === ALL || row.itemType === itemType) &&
        (view === "" || (view === "overdue" ? row.waitingDays >= OVERDUE_DAYS : row.blockers.length > 0))
      );
    });
  }, [department, itemType, query, rows, view]);

  // คำขอที่ต้องตรวจสอบก่อนอยู่กลุ่มบนสุด เพื่อไม่ให้ปะปนกับคำขอที่อนุมัติได้ทันที
  const blockedRows = filteredRows.filter((row) => row.blockers.length > 0);
  const readyRows = filteredRows.filter((row) => row.blockers.length === 0);
  const groups = [
    { id: "blocked", label: "ต้องตรวจสอบก่อน", rows: blockedRows },
    { id: "ready", label: "พร้อมอนุมัติ", rows: readyRows },
  ].filter((group) => group.rows.length > 0);

  // อนุมัติหลายรายการได้เฉพาะคำขอเบิกที่พร้อมอนุมัติ คำขอแก้ไขข้อมูลต้องเปิดดูหลักฐานทีละรายการ
  const bulkCandidates = readOnly ? [] : readyRows.filter((row) => row.itemType === "benefit");
  const selectedRows = bulkCandidates.filter((row) => selectedIds.includes(row.id));
  const allBulkSelected = bulkCandidates.length > 0 && selectedRows.length === bulkCandidates.length;
  const selectedTotal = selectedRows.reduce((sum, row) => sum + row.amount, 0);

  const overdueCount = rows.filter((row) => row.waitingDays >= OVERDUE_DAYS).length;
  const blockedCount = rows.filter((row) => row.blockers.length > 0).length;
  const filtersActive = query !== "" || department !== ALL || itemType !== ALL || view !== "";

  // หน้าต่างอนุมัติหลายรายการ: โฟกัสปุ่มยกเลิกก่อน, Esc ปิด, วนโฟกัสในหน้าต่าง
  useEffect(() => {
    if (!bulkOpen) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeBulk();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button:not([disabled])"));
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
  }, [bulkOpen]);

  // คืนโฟกัสให้ปุ่มเดิมหลังหน้าต่างปิด ต้องรอให้ inert ถูกถอดออกก่อน จึงทำใน effect ไม่ใช่ตอนกดปิด
  useEffect(() => {
    if (bulkOpen || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [bulkOpen]);

  // ปุ่มเลิกทำไม่หมดเวลาขณะผู้ใช้ชี้เมาส์หรือโฟกัสอยู่ที่ข้อความ (WCAG 2.2.1)
  useEffect(() => {
    if (!lastDone || undoPaused) return;
    const timer = window.setTimeout(() => setLastDone(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastDone, undoPaused]);

  function closeBulk() {
    restoreFocusRef.current = true;
    setBulkOpen(false);
  }

  async function confirmBulk(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (bulkBusy) return;
    setBulkBusy(true);
    setBulkError("");
    const approved: string[] = [];
    let failure = "";
    for (const row of selectedRows) {
      const response = await fetch(`/api/claims/${encodeURIComponent(row.id)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hr_approve" }),
      }).catch(() => null);
      if (response?.ok) {
        approved.push(row.id);
      } else {
        const data = await response?.json().catch(() => null);
        failure = `${row.id}: ${data?.error ?? "อนุมัติไม่สำเร็จ"}`;
        break;
      }
    }
    setBulkBusy(false);
    setDecidedIds((current) => [...current, ...approved]);
    setSelectedIds((current) => current.filter((id) => !approved.includes(id)));
    router.refresh();
    if (failure) {
      setBulkError(approved.length > 0 ? `อนุมัติแล้ว ${approved.length} รายการ แต่ ${failure}` : failure);
      return;
    }
    setLastDone({ ids: approved, message: `อนุมัติคำขอ ${approved.length} รายการแล้ว` });
    setUndoPaused(false);
    setBulkOpen(false);
    restoreFocusRef.current = false;
  }

  function resetFilters() {
    setQuery("");
    setDepartment(ALL);
    setItemType(ALL);
    setView("");
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  /** คลิกที่ใดก็ได้ในแถวเพื่อเปิดรายละเอียด ยกเว้นช่องเลือกและลิงก์ */
  function openRow(event: React.MouseEvent<HTMLTableRowElement>, id: string) {
    const target = event.target as HTMLElement;
    if (target.closest("a, button, input, label")) return;
    router.push(`${requestHref(id)}`);
  }

  return (
    <>
      <div className="page-content queue-page" inert={bulkOpen ? true : undefined}>
        <header className="queue-heading">
          <h1>คำขอรออนุมัติ</h1>
          <ul className="queue-summary" suppressHydrationWarning>
            <li>{todayLabel()}</li>
            <li>รอตรวจ {rows.length} รายการ</li>
            {/* ตัวเลขสรุปกดเพื่อดูเฉพาะกลุ่มนั้นได้ กดซ้ำเพื่อดูทั้งหมด */}
            {overdueCount > 0 ? (
              <li>
                <button
                  type="button"
                  className="queue-link-button queue-inline-link queue-overdue-text"
                  aria-pressed={view === "overdue"}
                  onClick={() => setView(view === "overdue" ? "" : "overdue")}
                >
                  รอ {OVERDUE_DAYS} วันขึ้นไป {overdueCount} รายการ
                </button>
              </li>
            ) : null}
            {blockedCount > 0 ? (
              <li>
                <button
                  type="button"
                  className="queue-link-button queue-inline-link"
                  aria-pressed={view === "blocked"}
                  onClick={() => setView(view === "blocked" ? "" : "blocked")}
                >
                  ต้องตรวจสอบก่อน {blockedCount} รายการ
                </button>
              </li>
            ) : null}
          </ul>
          {view ? (
            <p className="queue-view-note" role="status">
              กำลังแสดงเฉพาะ{view === "overdue" ? `คำขอที่รอ ${OVERDUE_DAYS} วันขึ้นไป` : "คำขอที่ต้องตรวจสอบก่อน"}{" "}
              <button type="button" className="queue-link-button queue-inline-link" onClick={() => setView("")}>ดูทั้งหมด</button>
            </p>
          ) : null}
        </header>

        <StatusTabs active="home" counts={{ ...counts, pending: rows.length }} query={tabQuery} />

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
                placeholder="ค้นหาเลขที่คำขอ ชื่อ รหัสพนักงาน หรือแผนก"
              />
            </label>
            <label className="queue-select">
              <span>แผนก</span>
              <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                <option>{ALL}</option>
                <DepartmentOptions tree={tree} />
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
              <Button variant="ghost" size="sm" onClick={resetFilters}>ล้างตัวกรอง</Button>
            ) : null}
          </div>

          <div className="queue-bulkbar" aria-live="polite">
            {selectedRows.length > 0 ? (
              <>
                <span>เลือก {selectedRows.length} รายการ · รวม {baht.format(selectedTotal)} บาท</span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={(event) => { triggerRef.current = event.currentTarget; setBulkOpen(true); }}
                >
                  อนุมัติที่เลือก
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>ยกเลิกการเลือก</Button>
              </>
            ) : (
              <span className="queue-meta">กดที่คำขอเพื่อดูรายละเอียด เอกสารแนบ และอนุมัติ · เลือกหลายคำขอเบิกเพื่ออนุมัติพร้อมกัน</span>
            )}
          </div>

          <div className="queue-table-scroll">
            <table className="queue-table queue-table-rows">
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
                  <th scope="col">เลขที่คำขอ</th>
                  <th scope="col">พนักงาน</th>
                  <th scope="col" className="queue-num">ยอดเบิก</th>
                  <th scope="col">ยื่นเมื่อ</th>
                  <th scope="col"><span className="sr-only">เปิดรายละเอียด</span></th>
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
                      <tr
                        key={row.id}
                        data-row-id={row.id}
                        className={`queue-link-row${row.blockers.length > 0 ? " queue-row-blocked" : ""}`}
                        onClick={(event) => openRow(event, row.id)}
                      >
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
                        <td data-label="เลขที่คำขอ">
                          <Link className="queue-request-link" href={requestHref(row.id)}>{row.id}</Link>
                          <span className="queue-item">{row.benefit}</span>
                          <span className="queue-meta">
                            {row.itemType === "edit"
                              ? `แก้ไขข้อมูล ${row.changes?.length ?? 0} รายการ`
                              : `เอกสารแนบ ${row.attachments?.length ?? 0} ไฟล์`}
                          </span>
                          {row.blockers.length > 0 ? (
                            <ul className="queue-blocker">
                              {row.blockers.map((blocker) => <li key={blocker.message}>{blocker.message}</li>)}
                            </ul>
                          ) : null}
                        </td>
                        <td data-label="พนักงาน">
                          <span className="queue-name">{row.name}</span>
                          <span className="queue-meta">
                            {row.employeeCode}
                            {row.employee?.department ? ` · ${row.employee.department}` : ""}
                          </span>
                          {row.employee && row.employee.status !== "ACTIVE" ? (
                            <Tag tone="neutral" className="mt-1">{row.employee.statusLabel}</Tag>
                          ) : null}
                        </td>
                        <td data-label="ยอดเบิก" className={`queue-num${row.itemType === "benefit" ? "" : " queue-cell-empty"}`}>
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
                        <td className="queue-open"><ChevronIcon /></td>
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

      {bulkOpen ? (
        <div className="decision-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeBulk(); }}>
          <section ref={dialogRef} className="decision-dialog queue-dialog" role="dialog" aria-modal="true" aria-labelledby="bulk-title">
            <button type="button" className="decision-close" onClick={closeBulk} aria-label="ปิดหน้าต่าง">×</button>
            <h2 id="bulk-title">ยืนยันการอนุมัติ {selectedRows.length} รายการ</h2>
            <table className="queue-changes">
              <caption>รวม {baht.format(selectedTotal)} บาท</caption>
              <thead>
                <tr><th scope="col">คำขอ</th><th scope="col">พนักงาน</th><th scope="col" className="queue-num">ยอดเบิก</th></tr>
              </thead>
              <tbody>
                {selectedRows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.id} · {row.benefit}</th>
                    <td>{row.name}</td>
                    <td className="queue-num">{baht.format(row.amount)} บาท</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {bulkError ? <p className="queue-alert" role="alert">{bulkError}</p> : null}
            <form onSubmit={confirmBulk}>
              <div className="decision-actions">
                <Button variant="secondary" onClick={closeBulk} data-initial-focus>ยกเลิก</Button>
                <Button type="submit" variant="primary" loading={bulkBusy}>{`ยืนยันอนุมัติ ${selectedRows.length} รายการ`}</Button>
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
          <button type="button" onClick={() => setLastDone(null)} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </>
  );
}
