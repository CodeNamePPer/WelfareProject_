import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase";
import type { Role } from "../auth/roles";
import { findEmployeeUuidByCode } from "../auth/users";
import { getSubordinates } from "../employee/subordinates";
import { DEFAULT_PAY_SETTINGS, resolvePayDate, type PaySettings } from "../../features/payroll/lib/pay-settings";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES } from "./forms";
import type { BudgetKind, ClaimAction, ClaimDbStatus, ClaimEventKind, ClaimRecord, EmployeeBenefit } from "./types";

export class ClaimInputError extends Error {
  constructor(message: string, public claimNo?: string) {
    super(message);
  }
}

export type ClaimActor = { sub: string; role: Role };

type NameParts = { title_th: string | null; first_name_th: string; last_name_th: string };

const TZ = "Asia/Bangkok";
export const bangkokDate = (at: Date | string = new Date()) => new Date(at).toLocaleDateString("sv-SE", { timeZone: TZ });

function nameOf(row: NameParts | null | undefined): string {
  if (!row) return "";
  const last = row.last_name_th?.trim();
  return `${row.title_th ?? ""}${row.first_name_th.trim()}${last && last !== "-" ? ` ${last}` : ""}`.trim();
}

/** สถานะที่กันวงเงินไว้ */
const COUNTED: ClaimDbStatus[] = ["pending_hr", "needs_revision", "pending_finance", "finance_returned", "awaiting_payment", "paid"];
const APPROVED: ClaimDbStatus[] = ["awaiting_payment", "paid"];
const FINANCE_VISIBLE: ClaimDbStatus[] = ["pending_finance", "finance_returned", "awaiting_payment", "paid", "rejected"];

const SELECT = `id, claim_no, status, amount_requested, amount_approved, expense_date, submitted_at, created_at, provider_name, note, details, pay_date_override, approval_no, accounting_ref, employee_id,
  benefit_id,
  owner:employee_id(employee_code, title_th, first_name_th, last_name_th, department:department_id(name_th)),
  submitter:submitted_by(employee_code, title_th, first_name_th, last_name_th),
  benefit:benefit_id(code, name_th, budget_type, form_type),
  benefit_limit:benefit_limit_id(amount),
  pay_round:pay_round_id(pay_date),
  receipts:welfare_claim_receipt(receipt_no, receipt_date, issuer_name, amount),
  attachments:welfare_claim_attachment(id, file_name, mime_type, size_bytes, deleted_at),
  events:welfare_claim_event(id, kind, created_at, note, actor_role, actor:actor_employee_id(employee_code, title_th, first_name_th, last_name_th)),
  payments:welfare_claim_payment(status, transfer_ref, paid_at, bank_code, account_no_masked, preparer:prepared_by(title_th, first_name_th, last_name_th))`;

interface ClaimRow {
  id: string;
  claim_no: string;
  status: ClaimDbStatus;
  amount_requested: number | string | null;
  amount_approved: number | string | null;
  expense_date: string | null;
  submitted_at: string | null;
  created_at: string;
  provider_name: string | null;
  note: string | null;
  details: Record<string, string> | null;
  pay_date_override: string | null;
  approval_no: string | null;
  accounting_ref: string | null;
  employee_id: string;
  benefit_id: string;
  owner: NameParts & { employee_code: string; department: { name_th: string } | null };
  submitter: NameParts & { employee_code: string };
  benefit: { code: string; name_th: string; budget_type: BudgetKind; form_type: string | null };
  benefit_limit: { amount: number | string } | null;
  pay_round: { pay_date: string } | null;
  receipts: { receipt_no: string | null; receipt_date: string | null; issuer_name: string | null; amount: number | string | null }[];
  attachments: { id: string; file_name: string; mime_type: string; size_bytes: number; deleted_at: string | null }[];
  events: { id: number; kind: ClaimEventKind; created_at: string; note: string | null; actor_role: string | null; actor: (NameParts & { employee_code: string }) | null }[];
  payments: { status: string; transfer_ref: string | null; paid_at: string | null; bank_code: string; account_no_masked: string; preparer: NameParts | null }[];
}

type UsageRow = {
  id: string;
  employee_id: string;
  benefit_id: string;
  status: ClaimDbStatus;
  amount_requested: number | string;
  amount_approved: number | string | null;
  expense_date: string;
};

/** รอบวงเงินเดียวกันหรือไม่ ตามกฎเดียวกับ guard_welfare_claim ในฐานข้อมูล */
function samePeriod(budget: BudgetKind, a: string, b: string) {
  if (budget === "per_claim") return false;
  return budget === "monthly" ? a.slice(0, 7) === b.slice(0, 7) : a.slice(0, 4) === b.slice(0, 4);
}

const usageAmount = (row: UsageRow) => Number(row.amount_approved ?? row.amount_requested);

async function fetchUsage(employeeIds: string[]): Promise<UsageRow[]> {
  if (employeeIds.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from("welfare_claim")
    .select("id, employee_id, benefit_id, status, amount_requested, amount_approved, expense_date")
    .in("employee_id", employeeIds)
    .in("status", COUNTED)
    .is("deleted_at", null)
    .returns<UsageRow[]>();
  if (error) throw error;
  return data ?? [];
}

function toRecord(row: ClaimRow, usage: UsageRow[]): ClaimRecord {
  const used = row.expense_date
    ? usage
        .filter((u) => u.employee_id === row.employee_id && u.benefit_id === row.benefit_id && u.id !== row.id && samePeriod(row.benefit.budget_type, u.expense_date, row.expense_date as string))
        .reduce((sum, u) => sum + usageAmount(u), 0)
    : 0;
  const events = [...row.events].sort((a, b) => a.id - b.id);
  const payment = row.payments.find((p) => p.status === "transferred") ?? row.payments[row.payments.length - 1] ?? null;
  return {
    id: row.id,
    claimNo: row.claim_no,
    status: row.status,
    employeeCode: row.owner.employee_code,
    employeeName: nameOf(row.owner),
    department: row.owner.department?.name_th ?? null,
    submittedByCode: row.submitter.employee_code,
    submittedByName: nameOf(row.submitter),
    benefitCode: row.benefit.code,
    benefitName: row.benefit.name_th,
    budgetType: row.benefit.budget_type,
    formType: row.benefit.form_type,
    amountRequested: Number(row.amount_requested ?? 0),
    amountApproved: row.amount_approved === null ? null : Number(row.amount_approved),
    expenseDate: row.expense_date,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
    providerName: row.provider_name,
    note: row.note,
    details: row.details ?? {},
    limit: Number(row.benefit_limit?.amount ?? 0),
    used,
    payRoundDate: row.pay_round?.pay_date ?? null,
    payDateOverride: row.pay_date_override,
    approvalNo: row.approval_no,
    accountingRef: row.accounting_ref,
    receipts: row.receipts.map((r) => ({ receiptNo: r.receipt_no, receiptDate: r.receipt_date, issuerName: r.issuer_name, amount: r.amount === null ? null : Number(r.amount) })),
    attachments: row.attachments.filter((a) => !a.deleted_at).map((a) => ({ id: a.id, fileName: a.file_name, mimeType: a.mime_type, sizeBytes: a.size_bytes })),
    events: events.map((e) => ({ kind: e.kind, at: e.created_at, actorCode: e.actor?.employee_code ?? null, actorName: e.actor ? nameOf(e.actor) : null, actorRole: e.actor_role, note: e.note })),
    payment: payment
      ? { transferRef: payment.transfer_ref, paidAt: payment.paid_at, bankCode: payment.bank_code, accountMasked: payment.account_no_masked, preparedByName: payment.preparer ? nameOf(payment.preparer) : null }
      : null,
  };
}

/** คืน null เมื่อโหลดไม่สำเร็จ เพื่อให้หน้าจอแจ้งตามจริงแทนการแสดงรายการว่าง */
export async function listClaims(options: { statuses?: ClaimDbStatus[]; employeeCode?: string } = {}): Promise<ClaimRecord[] | null> {
  try {
    let query = supabaseAdmin.from("welfare_claim").select(SELECT).is("deleted_at", null).order("created_at", { ascending: false });
    if (options.statuses) query = query.in("status", options.statuses);
    if (options.employeeCode) {
      const uuid = await findEmployeeUuidByCode(options.employeeCode);
      if (!uuid) return [];
      query = query.eq("employee_id", uuid);
    }
    const { data, error } = await query.returns<ClaimRow[]>();
    if (error) throw error;
    const rows = data ?? [];
    const usage = await fetchUsage([...new Set(rows.map((row) => row.employee_id))]);
    return rows.map((row) => toRecord(row, usage));
  } catch (err) {
    console.error("[claims] list failed", err);
    return null;
  }
}

export async function getClaim(claimNo: string): Promise<ClaimRecord | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_claim")
    .select(SELECT)
    .eq("claim_no", claimNo)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<ClaimRow | null>();
  if (error) throw error;
  if (!data) return null;
  return toRecord(data, await fetchUsage([data.employee_id]));
}

/** ผู้ที่เข้าระบบดูคำขอนี้ได้หรือไม่ ตามตารางสิทธิ์ในเอกสารออกแบบ */
export function canViewClaim(claim: ClaimRecord, actor: ClaimActor) {
  if (claim.employeeCode === actor.sub || claim.submittedByCode === actor.sub) return true;
  if (claim.status === "draft") return false;
  if (actor.role === "HR" || actor.role === "SUPER_ADMIN") return true;
  return actor.role === "FINANCE" && FINANCE_VISIBLE.includes(claim.status);
}

// ─── สิทธิ์สวัสดิการ ──────────────────────────────────────────────────────────

const BUDGET_LABEL: Record<BudgetKind, string> = { yearly: "ปี", monthly: "เดือน", per_claim: "ครั้ง" };

interface BenefitRow {
  id: string;
  code: string;
  name_th: string;
  description: string | null;
  budget_type: BudgetKind;
  category: string | null;
  form_type: string | null;
  max_claims_note: string | null;
  eligibility_note: string | null;
  required_documents: string[] | null;
}

/** สวัสดิการที่พนักงานคนนี้ใช้ได้ พร้อมยอดคงเหลือ คืน null เมื่อโหลดไม่สำเร็จ */
export async function getEmployeeBenefits(code: string): Promise<EmployeeBenefit[] | null> {
  try {
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employee")
      .select("id, employment_status, department_id, department:department_id(parent_department_id)")
      .eq("employee_code", code)
      .is("deleted_at", null)
      .maybeSingle()
      .returns<{ id: string; employment_status: string; department_id: string | null; department: { parent_department_id: string | null } | null } | null>();
    if (employeeError) throw employeeError;
    if (!employee || employee.employment_status !== "active") return [];

    const [benefits, limits, restrictions, usage] = await Promise.all([
      supabaseAdmin.from("welfare_benefit").select("id, code, name_th, description, budget_type, category, form_type, max_claims_note, eligibility_note, required_documents").eq("is_active", true).is("deleted_at", null).order("code").returns<BenefitRow[]>(),
      supabaseAdmin.from("v_welfare_benefit_current").select("id, current_amount").returns<{ id: string; current_amount: number | string | null }[]>(),
      supabaseAdmin.from("welfare_benefit_department").select("benefit_id, department_id").returns<{ benefit_id: string; department_id: string }[]>(),
      fetchUsage([employee.id]),
    ]);
    if (benefits.error) throw benefits.error;
    if (limits.error) throw limits.error;
    if (restrictions.error) throw restrictions.error;

    const today = bangkokDate();
    const limitOf = new Map((limits.data ?? []).map((row) => [row.id, row.current_amount]));
    const memberOf = [employee.department_id, employee.department?.parent_department_id].filter(Boolean);

    return (benefits.data ?? []).flatMap((benefit): EmployeeBenefit[] => {
      const allowed = (restrictions.data ?? []).filter((row) => row.benefit_id === benefit.id).map((row) => row.department_id);
      if (allowed.length > 0 && !allowed.some((id) => memberOf.includes(id))) return [];
      const rawLimit = limitOf.get(benefit.id);
      if (rawLimit === null || rawLimit === undefined) return [];
      const limit = Number(rawLimit);
      const current = usage.filter((u) => u.benefit_id === benefit.id && samePeriod(benefit.budget_type, u.expense_date, today));
      const used = current.filter((u) => APPROVED.includes(u.status)).reduce((sum, u) => sum + usageAmount(u), 0);
      const pending = current.filter((u) => !APPROVED.includes(u.status)).reduce((sum, u) => sum + usageAmount(u), 0);
      return [{
        code: benefit.code,
        name: benefit.name_th,
        description: benefit.description,
        category: benefit.category ?? "อื่น ๆ",
        formType: benefit.form_type ?? "general",
        budgetType: benefit.budget_type,
        budgetLabel: BUDGET_LABEL[benefit.budget_type],
        maxClaimsNote: benefit.max_claims_note,
        eligibilityNote: benefit.eligibility_note,
        documents: benefit.required_documents ?? [],
        limit,
        used,
        pending,
        remaining: Math.max(limit - used - pending, 0),
      }];
    });
  } catch (err) {
    console.error("[claims] load benefits failed", err);
    return null;
  }
}

// ─── ยื่นคำขอ ─────────────────────────────────────────────────────────────────

export interface SaveClaimInput {
  claimNo?: string;
  employeeCode: string;
  benefitCode: string;
  amount: number;
  expenseDate: string;
  providerName: string;
  note: string;
  details: Record<string, string>;
  receiptNo: string;
  receiptDate: string;
  submit: boolean;
  files: File[];
}

function safeFileName(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).replace(/[^.a-zA-Z0-9]/g, "") : "";
  return `${randomUUID()}${ext}`;
}

function assertFiles(files: File[]) {
  for (const file of files) {
    if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) throw new ClaimInputError(`ไฟล์ ${file.name} ต้องเป็น PDF, JPG หรือ PNG`);
    if (file.size > MAX_ATTACHMENT_BYTES) throw new ClaimInputError(`ไฟล์ ${file.name} มีขนาดเกิน 10 MB`);
  }
}

async function uploadAttachments(claimId: string, uploaderId: string, files: File[]): Promise<string[]> {
  const ids: string[] = [];
  for (const file of files) {
    const storagePath = `${claimId}/${safeFileName(file.name)}`;
    const { error: uploadError } = await supabaseAdmin.storage.from("welfare-claim-docs").upload(storagePath, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { data, error } = await supabaseAdmin
      .from("welfare_claim_attachment")
      .insert({ claim_id: claimId, file_name: file.name, storage_path: storagePath, mime_type: file.type, size_bytes: file.size, uploaded_by: uploaderId })
      .select("id")
      .single();
    if (error) throw error;
    ids.push(data.id);
  }
  return ids;
}

/** บันทึกฉบับร่างหรือยื่นคำขอ ยื่นไม่ผ่านแล้วฉบับร่างยังอยู่ และแจ้งเลขคำขอกลับไปในข้อผิดพลาด */
export async function saveClaim(input: SaveClaimInput, actor: ClaimActor): Promise<{ claimNo: string; status: ClaimDbStatus }> {
  assertFiles(input.files);

  if (input.employeeCode !== actor.sub) {
    const reports = await getSubordinates(actor.sub);
    if (!reports?.some((report) => report.id === input.employeeCode)) {
      throw new ClaimInputError("ยื่นแทนได้เฉพาะลูกน้องโดยตรงที่ยังทำงานอยู่");
    }
  }

  const [ownerId, submitterId, benefits, benefitRow] = await Promise.all([
    findEmployeeUuidByCode(input.employeeCode),
    findEmployeeUuidByCode(actor.sub),
    getEmployeeBenefits(input.employeeCode),
    supabaseAdmin.from("welfare_benefit").select("id").eq("code", input.benefitCode).is("deleted_at", null).maybeSingle(),
  ]);
  if (benefitRow.error) throw benefitRow.error;
  if (!ownerId || !submitterId) throw new ClaimInputError("ไม่พบข้อมูลพนักงาน");
  if (!benefitRow.data || !benefits?.some((benefit) => benefit.code === input.benefitCode)) {
    throw new ClaimInputError("พนักงานคนนี้ไม่มีสิทธิ์ในสวัสดิการที่เลือก");
  }

  if (input.expenseDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) throw new ClaimInputError("วันที่เกิดค่าใช้จ่ายไม่ถูกต้อง");
  if (input.expenseDate && input.expenseDate > bangkokDate()) throw new ClaimInputError("วันที่เกิดค่าใช้จ่ายต้องไม่อยู่ในอนาคต");

  const values = {
    benefit_id: benefitRow.data.id,
    amount_requested: input.amount > 0 ? input.amount : null,
    expense_date: input.expenseDate || null,
    provider_name: input.providerName || null,
    note: input.note || null,
    details: input.details,
  };

  let claim: { id: string; claim_no: string; status: ClaimDbStatus };
  if (input.claimNo) {
    const existing = await getClaim(input.claimNo);
    if (!existing || (existing.employeeCode !== actor.sub && existing.submittedByCode !== actor.sub)) throw new ClaimInputError("ไม่พบคำขอนี้");
    if (existing.status !== "draft" && existing.status !== "needs_revision") throw new ClaimInputError("คำขอนี้แก้ไขไม่ได้แล้ว");
    const { error } = await supabaseAdmin.from("welfare_claim").update(values).eq("id", existing.id);
    if (error) throw error;
    claim = { id: existing.id, claim_no: existing.claimNo, status: existing.status };
    const { error: clearError } = await supabaseAdmin.from("welfare_claim_receipt").delete().eq("claim_id", existing.id);
    if (clearError) throw clearError;
  } else {
    const { data, error } = await supabaseAdmin
      .from("welfare_claim")
      .insert({ ...values, employee_id: ownerId, submitted_by: submitterId })
      .select("id, claim_no, status")
      .single();
    if (error) throw error;
    claim = data as typeof claim;
  }

  const attachmentIds = await uploadAttachments(claim.id, submitterId, input.files);

  if (input.receiptNo || input.receiptDate) {
    const { error } = await supabaseAdmin.from("welfare_claim_receipt").insert({
      claim_id: claim.id,
      receipt_no: input.receiptNo || null,
      receipt_date: input.receiptDate || null,
      issuer_name: input.providerName || null,
      amount: input.amount > 0 ? input.amount : null,
      attachment_id: attachmentIds[0] ?? null,
    });
    if (error) throw error;
  }

  if (!input.submit) return { claimNo: claim.claim_no, status: claim.status };

  try {
    const { count, error: countError } = await supabaseAdmin
      .from("welfare_claim_attachment")
      .select("id", { count: "exact", head: true })
      .eq("claim_id", claim.id)
      .is("deleted_at", null);
    if (countError) throw countError;
    if (!count) throw new ClaimInputError("กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์");
    if (!input.receiptNo || !input.receiptDate) throw new ClaimInputError("กรุณาระบุเลขที่และวันที่ในใบเสร็จ");
    if (!input.providerName) throw new ClaimInputError("กรุณาระบุผู้ออกใบเสร็จหรือสถานพยาบาล");

    const { error } = await supabaseAdmin.rpc("welfare_claim_transition", {
      p_claim_id: claim.id,
      p_from: claim.status,
      p_to: "pending_hr",
      p_kind: claim.status === "needs_revision" ? "resubmitted" : "submitted",
      p_actor: submitterId,
      p_actor_role: actor.role,
    });
    if (error) throw error;
  } catch (err) {
    const message = err instanceof ClaimInputError ? err.message : (err as { code?: string; message?: string }).code === "P0001" ? (err as Error).message : null;
    if (message) throw new ClaimInputError(`${message} (บันทึกเป็น ${claim.claim_no} แล้ว แก้ไขแล้วกดส่งอีกครั้ง)`, claim.claim_no);
    throw err;
  }
  return { claimNo: claim.claim_no, status: "pending_hr" };
}

// ─── รอบจ่ายและค่าตั้งการจ่าย ──────────────────────────────────────────────────

export async function getPaySettings(): Promise<PaySettings> {
  const { data, error } = await supabaseAdmin.from("system_setting").select("value").eq("key", "pay_schedule").maybeSingle();
  if (error) throw error;
  return { ...DEFAULT_PAY_SETTINGS, ...((data?.value as Partial<PaySettings>) ?? {}) };
}

function roundOf(submittedAt: string) {
  const date = bangkokDate(submittedAt);
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, roundNo: (day <= 15 ? 1 : 2) as 1 | 2 };
}

async function ensurePayRound(submittedAt: string): Promise<string> {
  const { year, month, roundNo } = roundOf(submittedAt);
  const settings = await getPaySettings();
  const { error } = await supabaseAdmin
    .from("welfare_pay_round")
    .upsert({ year, month, round_no: roundNo, pay_date: resolvePayDate(year, month, roundNo, settings) }, { onConflict: "year,month,round_no", ignoreDuplicates: true });
  if (error) throw error;
  const { data, error: selectError } = await supabaseAdmin.from("welfare_pay_round").select("id").eq("year", year).eq("month", month).eq("round_no", roundNo).single();
  if (selectError) throw selectError;
  return data.id;
}

export async function getPayrollState() {
  const [settings, overrides] = await Promise.all([
    getPaySettings(),
    supabaseAdmin.from("welfare_claim").select("claim_no, pay_date_override").not("pay_date_override", "is", null).in("status", ["pending_finance", "awaiting_payment"]),
  ]);
  if (overrides.error) throw overrides.error;
  return { settings, overrides: Object.fromEntries((overrides.data ?? []).map((row) => [row.claim_no, row.pay_date_override as string])) };
}

/** บันทึกวันจ่ายของแต่ละรอบ และปรับกำหนดจ่ายของรอบที่ยังเปิดอยู่ให้ตรงกัน */
export async function savePaySettings(settings: PaySettings) {
  const { error } = await supabaseAdmin.from("system_setting").update({ value: settings }).eq("key", "pay_schedule");
  if (error) throw error;
  const { data, error: roundsError } = await supabaseAdmin.from("welfare_pay_round").select("id, year, month, round_no").eq("status", "open");
  if (roundsError) throw roundsError;
  for (const round of data ?? []) {
    const { error: updateError } = await supabaseAdmin
      .from("welfare_pay_round")
      .update({ pay_date: resolvePayDate(round.year, round.month, round.round_no as 1 | 2, settings) })
      .eq("id", round.id);
    if (updateError) throw updateError;
  }
}

export async function setPayDate(claimNos: string[], date: string | null, reason: string, actor: ClaimActor) {
  const actorId = await findEmployeeUuidByCode(actor.sub);
  if (!actorId) throw new ClaimInputError("ไม่พบข้อมูลผู้ดำเนินการ");
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < bangkokDate())) throw new ClaimInputError("วันจ่ายใหม่ต้องไม่ย้อนหลัง");
  if (!reason.trim()) throw new ClaimInputError("กรุณาระบุเหตุผลที่เลื่อนวันจ่าย");
  const { data, error } = await supabaseAdmin.from("welfare_claim").select("id, claim_no").in("claim_no", claimNos);
  if (error) throw error;
  for (const claim of data ?? []) {
    const { error: rpcError } = await supabaseAdmin.rpc("welfare_claim_set_pay_date", {
      p_claim_id: claim.id,
      p_date: date,
      p_actor: actorId,
      p_actor_role: actor.role,
      p_note: reason.trim(),
    });
    if (rpcError) throw rpcError;
  }
}

// ─── เปลี่ยนสถานะ ─────────────────────────────────────────────────────────────

type TransitionRule = { roles: Role[]; from: ClaimDbStatus[]; to: ClaimDbStatus; kind: ClaimEventKind; needsNote?: string };

const RULES: Record<Exclude<ClaimAction, "pay" | "cancel">, TransitionRule> = {
  hr_approve: { roles: ["HR"], from: ["pending_hr", "finance_returned"], to: "pending_finance", kind: "hr_approved" },
  hr_return: { roles: ["HR"], from: ["pending_hr", "finance_returned"], to: "needs_revision", kind: "revision_requested", needsNote: "กรุณาระบุสิ่งที่พนักงานต้องแก้ไข" },
  hr_reject: { roles: ["HR"], from: ["pending_hr", "finance_returned"], to: "rejected", kind: "rejected", needsNote: "กรุณาระบุเหตุผลที่ปฏิเสธ" },
  finance_approve: { roles: ["FINANCE"], from: ["pending_finance"], to: "awaiting_payment", kind: "finance_approved" },
  finance_return: { roles: ["FINANCE"], from: ["pending_finance", "awaiting_payment"], to: "finance_returned", kind: "returned", needsNote: "กรุณาระบุเหตุผลที่ส่งกลับ" },
  finance_reject: { roles: ["FINANCE"], from: ["pending_finance", "awaiting_payment"], to: "rejected", kind: "rejected", needsNote: "กรุณาระบุเหตุผลที่ปฏิเสธ" },
};

export interface ClaimActionInput {
  action: ClaimAction;
  note?: string;
  amountApproved?: number;
  transferRef?: string;
}

export async function applyClaimAction(claimNo: string, input: ClaimActionInput, actor: ClaimActor) {
  const claim = await getClaim(claimNo);
  if (!claim || !canViewClaim(claim, actor)) throw new ClaimInputError("ไม่พบคำขอนี้");
  const actorId = await findEmployeeUuidByCode(actor.sub);
  if (!actorId) throw new ClaimInputError("ไม่พบข้อมูลผู้ดำเนินการ");
  const note = input.note?.trim() || null;

  if (input.action === "cancel") {
    if (claim.employeeCode !== actor.sub && claim.submittedByCode !== actor.sub) throw new ClaimInputError("ยกเลิกได้เฉพาะคำขอของตัวเอง");
    if (!["draft", "pending_hr", "needs_revision"].includes(claim.status)) throw new ClaimInputError("คำขอนี้ยกเลิกไม่ได้แล้ว");
    const { error } = await supabaseAdmin.rpc("welfare_claim_transition", {
      p_claim_id: claim.id, p_from: claim.status, p_to: "cancelled", p_kind: "cancelled", p_actor: actorId, p_actor_role: actor.role, p_note: note,
    });
    if (error) throw error;
    return;
  }

  if (input.action === "pay") {
    if (actor.role !== "FINANCE") throw new ClaimInputError("ไม่มีสิทธิ์ดำเนินการ");
    const transferRef = input.transferRef?.trim();
    if (!transferRef) throw new ClaimInputError("กรุณาระบุเลขอ้างอิงการโอน");
    const ownerId = await findEmployeeUuidByCode(claim.employeeCode);
    const { data: account, error: accountError } = await supabaseAdmin
      .from("employee_bank_account")
      .select("id, bank_code, account_no_masked")
      .eq("employee_id", ownerId)
      .eq("is_primary", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (accountError) throw accountError;
    const { error } = await supabaseAdmin.rpc("welfare_claim_record_payment", {
      p_claim_id: claim.id,
      p_bank_account_id: account?.id ?? null,
      p_bank_code: account?.bank_code ?? "ไม่ระบุ",
      p_account_masked: account?.account_no_masked ?? "-",
      p_transfer_ref: transferRef,
      p_actor: actorId,
      p_actor_role: actor.role,
    });
    if (error) throw error;
    return;
  }

  const rule = RULES[input.action];
  if (!rule) throw new ClaimInputError("คำสั่งไม่ถูกต้อง");
  if (!rule.roles.includes(actor.role)) throw new ClaimInputError("ไม่มีสิทธิ์ดำเนินการ");
  if (!rule.from.includes(claim.status)) throw new ClaimInputError("สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่");
  if (rule.needsNote && !note) throw new ClaimInputError(rule.needsNote);

  let amountApproved: number | null = null;
  let payRoundId: string | null = null;
  if (input.action === "finance_approve") {
    amountApproved = input.amountApproved ?? claim.amountRequested;
    if (!(amountApproved >= 0) || amountApproved > claim.amountRequested) throw new ClaimInputError("ยอดอนุมัติต้องไม่เกินยอดขอเบิก");
    if (amountApproved !== claim.amountRequested && !note) throw new ClaimInputError("กรุณาระบุเหตุผลที่ปรับยอด");
    payRoundId = await ensurePayRound(claim.submittedAt ?? new Date().toISOString());
  }

  const { error } = await supabaseAdmin.rpc("welfare_claim_transition", {
    p_claim_id: claim.id,
    p_from: claim.status,
    p_to: rule.to,
    p_kind: rule.kind,
    p_actor: actorId,
    p_actor_role: actor.role,
    p_note: note,
    p_amount_approved: amountApproved,
    p_pay_round_id: payRoundId,
  });
  if (error) throw error;
}

export async function getAttachmentUrl(attachmentId: string, actor: ClaimActor): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_claim_attachment")
    .select("storage_path, claim:claim_id(claim_no)")
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<{ storage_path: string; claim: { claim_no: string } } | null>();
  if (error) throw error;
  if (!data) return null;
  const claim = await getClaim(data.claim.claim_no);
  if (!claim || !canViewClaim(claim, actor)) return null;
  const signed = await supabaseAdmin.storage.from("welfare-claim-docs").createSignedUrl(data.storage_path, 60);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

/** แปลงข้อผิดพลาดเป็นคำตอบของ API */
export function claimErrorResponse(err: unknown): { status: number; body: { error: string; claimNo?: string } } {
  if (err instanceof ClaimInputError) return { status: 400, body: { error: err.message, claimNo: err.claimNo } };
  const pg = err as { code?: string; message?: string };
  if (pg?.code === "P0001" && pg.message) return { status: 400, body: { error: pg.message } };
  console.error("[claims] request failed", err);
  return { status: 500, body: { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง" } };
}
