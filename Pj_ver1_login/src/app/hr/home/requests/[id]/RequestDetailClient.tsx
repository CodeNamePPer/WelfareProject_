"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { HrEmployee } from "@/lib/hr/employees";
import { formatThaiDate } from "@/lib/format";
import { STATUS_LABEL, type RequestDetail } from "../../../sample/requests";
import { readDecisions, removeDecisions, saveDecisions, type SampleDecision } from "../../../sampleDecisions";
import {
  ACTION_COPY,
  OVERDUE_DAYS,
  baht,
  canDecide,
  daysBetween,
  findBlockers,
  prefillReason,
  remainingAfter,
  suggestedAction,
  todayIso,
  waitingLabel,
  type RequestAction,
} from "../../queueRules";

const STATUS_TONE = { pending: "pending", approved: "approved", rejected: "rejected", revision: "revision" } as const;
const DONE_TONE: Record<RequestAction, keyof typeof STATUS_TONE> = { approve: "approved", reject: "rejected", return: "revision" };

export function RequestDetailClient({
  detail,
  employee,
  employeesFailed,
  actorName,
  viewerCode,
}: {
  detail: RequestDetail;
  employee: HrEmployee | null;
  employeesFailed: boolean;
  actorName: string | null;
  viewerCode: string | null;
}) {
  const router = useRouter();
  const { request, status, decision } = detail;
  const [action, setAction] = useState<RequestAction | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [sampleDecision, setSampleDecision] = useState<SampleDecision | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // การตัดสินคำขอตัวอย่างที่ทำไว้ในแท็บนี้
  useEffect(() => {
    setSampleDecision(readDecisions()[request.id] ?? null);
  }, [request.id]);

  useEffect(() => {
    if (!action) return;
    panelRef.current?.querySelector<HTMLElement>(action === "approve" ? "[data-initial-focus]" : "textarea")?.focus();
  }, [action]);

  useEffect(() => {
    if (!preview) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPreview(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview]);

  const isPending = status === "pending" && !sampleDecision;
  const blockers = status === "pending" && !employeesFailed ? findBlockers(request, employee, viewerCode) : [];
  const suggested = suggestedAction(blockers);
  const remaining = remainingAfter(request);
  const waitingDays = daysBetween(request.submitted, todayIso());
  const shownStatus = sampleDecision ? DONE_TONE[sampleDecision.action] : STATUS_TONE[status];

  function startAction(next: RequestAction) {
    setAction(next);
    setReason(next === "approve" ? "" : prefillReason(blockers, next));
    setReasonError("");
  }

  function cancelAction() {
    setAction(null);
    setReason("");
    setReasonError("");
  }

  function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!action) return;
    if (action !== "approve" && !reason.trim()) {
      setReasonError(action === "reject" ? "กรุณาระบุเหตุผลที่ปฏิเสธ" : "กรุณาระบุสิ่งที่พนักงานต้องแก้ไข");
      return;
    }
    saveDecisions([request.id], action, reason.trim());
    router.push(`/hr/home?done=${encodeURIComponent(request.id)}&action=${action}`);
  }

  function undoSample() {
    removeDecisions([request.id]);
    setSampleDecision(null);
  }

  const name = employee?.name ?? request.fallbackName;

  return (
    <div className="page-content queue-page request-page">
      <nav className="profile-breadcrumb" aria-label="ตำแหน่งหน้า">
        <Link href={status === "pending" ? "/hr/home" : `/hr/home/${status}`}>
          {status === "pending" ? "คำขอรออนุมัติ" : `คำขอที่${STATUS_LABEL[status]}`}
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{request.id}</span>
      </nav>

      <header className="queue-heading request-heading">
        <p className="request-id">เลขที่คำขอ {request.id}</p>
        <h1>{request.benefit}</h1>
        <ul className="queue-summary">
          <li>
            <span className={`request-status request-status-${shownStatus}`}>
              {sampleDecision ? `${ACTION_COPY[sampleDecision.action].done}แล้ว (ตัวอย่าง)` : STATUS_LABEL[status]}
            </span>
          </li>
          <li>{request.itemType === "edit" ? "คำขอแก้ไขข้อมูล" : "คำขอเบิกสวัสดิการ"}</li>
          <li>ยื่นเมื่อ {formatThaiDate(request.submitted)}</li>
          {status === "pending" ? (
            <li className={waitingDays >= OVERDUE_DAYS ? "queue-overdue-text" : undefined}>{waitingLabel(waitingDays)}</li>
          ) : null}
        </ul>
      </header>

      {employeesFailed ? (
        <p className="queue-alert" role="alert">
          โหลดข้อมูลพนักงานไม่สำเร็จ จึงยังตรวจสถานะและสิทธิ์ของผู้ยื่นไม่ได้{" "}
          <button type="button" className="queue-link-button" onClick={() => window.location.reload()}>ลองโหลดใหม่</button>
        </p>
      ) : null}

      <div className="request-layout">
        <div className="request-main">
          {blockers.length > 0 && isPending ? (
            <section className="queue-dialog-blockers request-blockers" aria-labelledby="blockers-title">
              <strong id="blockers-title">ต้องตรวจสอบก่อนอนุมัติ</strong>
              <ul>{blockers.map((blocker) => <li key={blocker.message}>{blocker.message}</li>)}</ul>
            </section>
          ) : null}

          <section className="queue-sheet request-section" aria-labelledby="request-detail-title">
            <h2 id="request-detail-title">รายละเอียดคำขอ</h2>
            <dl className="profile-facts">
              <div><dt>เลขที่คำขอ</dt><dd>{request.id}</dd></div>
              <div><dt>ประเภท</dt><dd>{request.itemType === "edit" ? "แก้ไขข้อมูล" : "เบิกสวัสดิการ"}</dd></div>
              <div><dt>รายการ</dt><dd>{request.benefit}</dd></div>
              <div><dt>วันที่ยื่น</dt><dd>{formatThaiDate(request.submitted)}</dd></div>
              {request.itemType === "benefit" ? (
                <>
                  <div><dt>ยอดเบิก</dt><dd className="request-amount">{baht.format(request.amount)} บาท</dd></div>
                  {request.limit > 0 ? (
                    <>
                      <div><dt>วงเงินต่อปี</dt><dd>{baht.format(request.limit)} บาท</dd></div>
                      <div><dt>ใช้ไปแล้ว</dt><dd>{baht.format(request.used)} บาท</dd></div>
                      <div>
                        <dt>{status === "pending" ? "คงเหลือหลังอนุมัติ" : "คงเหลือ"}</dt>
                        <dd className={remaining !== null && remaining < 0 ? "queue-meta-danger" : undefined}>
                          {remaining !== null && remaining < 0 ? `เกินวงเงิน ${baht.format(-remaining)} บาท` : `${baht.format(remaining ?? 0)} บาท`}
                        </dd>
                      </div>
                    </>
                  ) : null}
                </>
              ) : null}
            </dl>

            {request.changes && request.changes.length > 0 ? (
              <table className="queue-changes request-changes">
                <caption>ข้อมูลที่ขอแก้ไข</caption>
                <thead>
                  <tr><th scope="col">รายการ</th><th scope="col">ข้อมูลเดิม</th><th scope="col">ข้อมูลใหม่</th></tr>
                </thead>
                <tbody>
                  {request.changes.map((change) => (
                    <tr key={change.field}>
                      <th scope="row">{change.field}</th>
                      <td>{change.before}</td>
                      <td>{change.before === change.after ? <span className="queue-meta">ไม่เปลี่ยนแปลง</span> : <strong>{change.after}</strong>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </section>

          <section className="queue-sheet request-section" aria-labelledby="attachments-title">
            <div className="request-section-head">
              <h2 id="attachments-title">เอกสารแนบ</h2>
              <span className="queue-meta">เอกสารตัวอย่าง · กดที่รูปเพื่อดูขนาดเต็ม</span>
            </div>
            {request.attachments && request.attachments.length > 0 ? (
              <ul className="request-attachments">
                {request.attachments.map((file) => (
                  <li key={file.src}>
                    <button type="button" className="request-attachment" onClick={() => setPreview(file.src)} aria-label={`ดู ${file.name} ขนาดเต็ม`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- รูปตัวอย่างแบบ SVG ไม่ต้องผ่าน next/image */}
                      <img src={file.src} alt={file.name} loading="lazy" />
                    </button>
                    <span className="request-attachment-name">{file.name}</span>
                    <span className="queue-meta">{file.size}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={status === "pending" && request.itemType === "benefit" ? "queue-meta-danger" : "queue-meta"}>
                {status === "pending" ? "ไม่มีเอกสารแนบ" : "ข้อมูลตัวอย่างนี้ไม่มีเอกสารแนบ"}
              </p>
            )}
          </section>

          {decision ? (
            <section className="queue-sheet request-section" aria-labelledby="decision-record-title">
              <h2 id="decision-record-title">ผลการพิจารณา</h2>
              <dl className="profile-facts">
                <div><dt>สถานะ</dt><dd>{STATUS_LABEL[status]}</dd></div>
                <div><dt>ดำเนินการโดย</dt><dd>{actorName}</dd></div>
                <div><dt>วันที่</dt><dd>{formatThaiDate(decision.date)}</dd></div>
                {decision.note ? <div><dt>{status === "rejected" ? "เหตุผลที่ปฏิเสธ" : "สิ่งที่ต้องแก้ไข"}</dt><dd>{decision.note}</dd></div> : null}
              </dl>
            </section>
          ) : null}
        </div>

        <aside className="request-aside">
          <section className="queue-sheet request-section" aria-labelledby="employee-title">
            <h2 id="employee-title">ผู้ยื่นคำขอ</h2>
            <p className="request-employee-name">
              {employee ? <Link className="queue-name-link" href={`/hr/employees/${encodeURIComponent(employee.code)}`}>{name}</Link> : name}
            </p>
            <dl className="request-employee-facts">
              <div><dt>รหัสพนักงาน</dt><dd>{request.employeeCode}</dd></div>
              {employee ? (
                <>
                  <div><dt>สถานะ</dt><dd><span className={`employment-status ${employee.status.toLowerCase()}`}>{employee.statusLabel}</span>{employee.statusDate ? <span className="queue-meta">ตั้งแต่ {formatThaiDate(employee.statusDate)}</span> : null}</dd></div>
                  <div><dt>ฝ่าย / แผนก</dt><dd>{employee.department ? `${employee.parentDepartment ? `${employee.parentDepartment} › ` : ""}${employee.department}` : "—"}</dd></div>
                  <div><dt>ตำแหน่ง</dt><dd>{employee.position ?? "—"}{employee.jobLevel ? <span className="queue-meta">{employee.jobLevel}</span> : null}</dd></div>
                  <div><dt>หัวหน้า</dt><dd>{employee.manager ? <Link className="queue-name-link" href={`/hr/employees/${encodeURIComponent(employee.manager.code)}`}>{employee.manager.name}</Link> : "—"}</dd></div>
                  <div><dt>วันเริ่มงาน</dt><dd>{formatThaiDate(employee.hireDate)}</dd></div>
                </>
              ) : !employeesFailed ? (
                <div><dt>สถานะ</dt><dd className="queue-meta-danger">ไม่พบในรายชื่อพนักงาน</dd></div>
              ) : null}
            </dl>
          </section>

          {status === "pending" ? (
            <section className="queue-sheet request-section request-decision" aria-labelledby="decide-title" ref={panelRef}>
              <h2 id="decide-title">การพิจารณา</h2>
              {sampleDecision ? (
                <div role="status">
                  <p>(ตัวอย่าง) คุณ{ACTION_COPY[sampleDecision.action].done}คำขอนี้แล้ว ยังไม่ได้บันทึกลงระบบ</p>
                  {sampleDecision.reason ? <p className="queue-meta">เหตุผล: {sampleDecision.reason}</p> : null}
                  <button type="button" className="queue-secondary request-undo" onClick={undoSample}>เลิกทำ</button>
                </div>
              ) : !canDecide(blockers) ? (
                <p className="queue-meta">เป็นคำขอของคุณเอง รอเจ้าหน้าที่คนอื่นเป็นผู้ตัดสิน</p>
              ) : action ? (
                <form onSubmit={confirm} className="request-decision-form">
                  <p className="request-decision-title">{ACTION_COPY[action].title}</p>
                  {action !== "approve" ? (
                    <label className="decision-reason">
                      <span>{action === "reject" ? "เหตุผลที่ปฏิเสธ" : "สิ่งที่พนักงานต้องแก้ไข"} <span className="reason-required">*</span></span>
                      <textarea
                        value={reason}
                        onChange={(event) => {
                          setReason(event.target.value);
                          if (event.target.value.trim()) setReasonError("");
                        }}
                        rows={4}
                        aria-invalid={Boolean(reasonError)}
                        aria-describedby={reasonError ? "decision-reason-error" : undefined}
                        required
                      />
                      {reasonError ? <small id="decision-reason-error" className="decision-error">{reasonError}</small> : null}
                    </label>
                  ) : (
                    <p className="queue-meta">
                      {request.itemType === "benefit"
                        ? `อนุมัติยอด ${baht.format(request.amount)} บาท คงเหลือหลังอนุมัติ ${baht.format(remaining ?? 0)} บาท`
                        : `อนุมัติการแก้ไขข้อมูล ${request.changes?.filter((c) => c.before !== c.after).length ?? 0} รายการตามตารางด้านซ้าย`}
                    </p>
                  )}
                  <div className="request-decision-actions">
                    <button type="button" className="queue-secondary" onClick={cancelAction} data-initial-focus>ยกเลิก</button>
                    <button type="submit" className={`queue-primary${action === "reject" ? " queue-primary-danger" : ""}`}>
                      {ACTION_COPY[action].confirm}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="request-decision-actions request-decision-choices">
                  {blockers.length === 0 ? (
                    <button type="button" className="queue-primary" onClick={() => startAction("approve")}>อนุมัติ</button>
                  ) : null}
                  {(["return", "reject"] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={
                        suggested === item
                          ? `queue-primary${item === "reject" ? " queue-primary-danger" : ""}`
                          : `queue-secondary${item === "reject" ? " queue-danger" : ""}`
                      }
                      onClick={() => startAction(item)}
                    >
                      {ACTION_COPY[item].done}
                    </button>
                  ))}
                </div>
              )}
            </section>
          ) : null}
        </aside>
      </div>

      {preview ? (
        <div className="decision-backdrop request-preview" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
          <figure role="dialog" aria-modal="true" aria-label="ดูเอกสารขนาดเต็ม">
            <button type="button" className="decision-close" onClick={() => setPreview(null)} aria-label="ปิด" autoFocus>×</button>
            {/* eslint-disable-next-line @next/next/no-img-element -- รูปตัวอย่างแบบ SVG */}
            <img src={preview} alt={request.attachments?.find((file) => file.src === preview)?.name ?? "เอกสารแนบ"} />
          </figure>
        </div>
      ) : null}
    </div>
  );
}
