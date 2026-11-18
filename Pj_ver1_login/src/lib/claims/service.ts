import "server-only";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../supabase";
import { DEFAULT_ADVANCE_RECEIPT_DAYS } from "./types";
import type { Role } from "../auth/roles";
import { findEmployeeUuidByCode } from "../auth/users";
import { getSubordinates } from "../employee/subordinates";
import { proxyReasonOf } from "../../features/hr/queue";
import { DEFAULT_PAY_SETTINGS, resolvePayDate, type PaySettings } from "../../features/payroll/lib/pay-settings";
import { ALLOWED_ATTACHMENT_TYPES, MAX_ATTACHMENT_BYTES, maxClaimsLabel } from "./forms";
import { emailHr, isHrEmployee } from "../hr/emailNotify";
import { signBenefitImages } from "../benefitImages";
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

export { DEFAULT_ADVANCE_RECEIPT_DAYS };

const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const SELECT = `id, claim_no, status, is_advance, amount_requested, amount_approved, expense_date, submitted_at, created_at, provider_name, note, details, pay_date_override, approval_no, accounting_ref, employee_id,
  benefit_id, proxy_reason, beneficiary_relation, beneficiary_name, total_cost, insurance_paid, insurer_name,
  owner:employee_id(employee_code, title_th, first_name_th, last_name_th, department:department_id(name_th)),
  submitter:submitted_by(employee_code, title_th, first_name_th, last_name_th),
  benefit:benefit_id(code, name_th, budget_type, form_type),
  benefit_limit:benefit_limit_id(amount),
  pay_round:pay_round_id(pay_date),
  advance:welfare_claim_advance(status, advance_amount, advance_paid_at, receipt_due_date, receipt_amount, settlement, extra_amount_approved, refund_amount),
  receipts:welfare_claim_receipt(receipt_no, receipt_date, issuer_name, amount),
  attachments:welfare_claim_attachment(id, file_name, mime_type, size_bytes, doc_kind, is_restricted, deleted_at),
  events:welfare_claim_event(id, kind, created_at, note, actor_role, actor:actor_employee_id(employee_code, title_th, first_name_th, last_name_th)),
  payments:welfare_claim_payment(status, transfer_ref, paid_at, bank_code, account_no_masked, preparer:prepared_by(title_th, first_name_th, last_name_th))`;

interface AdvanceRow {
  status: string;
  advance_amount: number | string;
  advance_paid_at: string | null;
  receipt_due_date: string;
  receipt_amount: number | string | null;
  settlement: string | null;
  extra_amount_approved: number | string | null;
  refund_amount: number | string | null;
}

interface ClaimRow {
  id: string;
  claim_no: string;
  status: ClaimDbStatus;
  is_advance: boolean | null;
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
  proxy_reason: string | null;
  beneficiary_relation: string | null;
  beneficiary_name: string | null;
  total_cost: number | string | null;
  insurance_paid: number | string | null;
  insurer_name: string | null;
  owner: NameParts & { employee_code: string; department: { name_th: string } | null };
  submitter: NameParts & { employee_code: string };
  benefit: { code: string; name_th: string; budget_type: BudgetKind; form_type: string | null };
  benefit_limit: { amount: number | string } | null;
  pay_round: { pay_date: string } | null;
  advance: AdvanceRow | AdvanceRow[] | null;
  receipts: { receipt_no: string | null; receipt_date: string | null; issuer_name: string | null; amount: number | string | null }[];
  attachments: { id: string; file_name: string; mime_type: string; size_bytes: number; doc_kind: string | null; is_restricted: boolean | null; deleted_at: string | null }[];
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
  const advRow = Array.isArray(row.advance) ? (row.advance[0] ?? null) : row.advance;
  return {
    id: row.id,
    claimNo: row.claim_no,
    status: row.status,
    employeeCode: row.owner.employee_code,
    employeeName: nameOf(row.owner),
    department: row.owner.department?.name_th ?? null,
    submittedByCode: row.submitter.employee_code,
    submittedByName: nameOf(row.submitter),
    proxyReason: row.proxy_reason,
    beneficiaryRelation: row.beneficiary_relation,
    beneficiaryName: row.beneficiary_name,
    totalCost: row.total_cost === null ? null : Number(row.total_cost),
    insurancePaid: row.insurance_paid === null ? null : Number(row.insurance_paid),
    insurerName: row.insurer_name,
    advance: advRow
      ? {
          status: advRow.status,
          advanceAmount: Number(advRow.advance_amount),
          advancePaidAt: advRow.advance_paid_at,
          receiptDueDate: advRow.receipt_due_date,
          receiptAmount: advRow.receipt_amount === null ? null : Number(advRow.receipt_amount),
          settlement: advRow.settlement,
          extraAmountApproved: advRow.extra_amount_approved === null ? null : Number(advRow.extra_amount_approved),
          refundAmount: advRow.refund_amount === null ? null : Number(advRow.refund_amount),
        }
      : null,
    isAdvance: Boolean(row.is_advance),
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
    attachments: row.attachments
      .filter((a) => !a.deleted_at)
      .map((a) => ({
        id: a.id,
        fileName: a.file_name,
        mimeType: a.mime_type,
        sizeBytes: a.size_bytes,
        docKind: a.doc_kind,
        isRestricted: Boolean(a.is_restricted || a.doc_kind === "medical_certificate"),
      })),
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

/** จำนวนคำขอที่ถูกส่งกลับมารอพนักงานคนนี้แก้ไข ใช้กับตัวเลขบนเมนู โหลดไม่ได้คืน 0 */
export async function countClaimsToRevise(employeeCode: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("welfare_claim")
    .select("id, owner:employee_id!inner(employee_code)", { count: "exact", head: true })
    .eq("owner.employee_code", employeeCode)
    .eq("status", "needs_revision")
    .is("deleted_at", null);
  if (error) {
    console.error("[claims] count revisions failed", error);
    return 0;
  }
  return count ?? 0;
}

/** จำนวนคำขอที่รอ HR ตรวจ (ยื่นใหม่หรือการเงินส่งกลับ) ใช้กับตัวเลขบนเมนู HR โหลดไม่ได้คืน 0 */
export async function countClaimsForHr(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("welfare_claim")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending_hr", "finance_returned"])
    .is("deleted_at", null);
  if (error) {
    console.error("[claims] count HR queue failed", error);
    return 0;
  }
  return count ?? 0;
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
  max_claims: number | null;
  max_claims_note: string | null;
  eligibility_note: string | null;
  required_documents: string[] | null;
  allow_advance: boolean | null;
  advance_receipt_days: number | null;
  image_path: string | null;
}

/** สวัสดิการที่พนักงานคนนี้ใช้ได้ พร้อมยอดคงเหลือ คืน null เมื่อโหลดไม่สำเร็จ */
export async function getEmployeeBenefits(code: string): Promise<EmployeeBenefit[] | null> {
  try {
    const { data: employee, error: employeeError } = await supabaseAdmin
      .from("employee")
      .select("id, employment_status, department_id, job_level_id, department:department_id(parent_department_id)")
      .eq("employee_code", code)
      .is("deleted_at", null)
      .maybeSingle()
      .returns<{ id: string; employment_status: string; department_id: string | null; job_level_id: string | null; department: { parent_department_id: string | null } | null } | null>();
    if (employeeError) throw employeeError;
    if (!employee || employee.employment_status !== "active") return [];

    const today = bangkokDate();
    // วงเงินลำดับเดียวกับ guard_welfare_claim: รายคน > ตามระดับตำแหน่ง > วงเงินกลาง (ไม่งั้นหน้าจอให้ยื่นแต่ฐานข้อมูลปฏิเสธ)
    const scope = [`employee_id.eq.${employee.id}`, "and(employee_id.is.null,job_level_id.is.null)"];
    if (employee.job_level_id) scope.push(`and(employee_id.is.null,job_level_id.eq.${employee.job_level_id})`);
    const [benefits, limits, restrictions, usage] = await Promise.all([
      supabaseAdmin.from("welfare_benefit").select("id, code, name_th, description, budget_type, category, form_type, max_claims, max_claims_note, eligibility_note, required_documents, allow_advance, advance_receipt_days, image_path").eq("is_active", true).is("deleted_at", null).order("code").returns<BenefitRow[]>(),
      supabaseAdmin
        .from("welfare_benefit_limit")
        .select("benefit_id, amount, effective_from, employee_id, job_level_id")
        .lte("effective_from", today)
        .or(scope.join(","))
        .returns<{ benefit_id: string; amount: number | string; effective_from: string; employee_id: string | null; job_level_id: string | null }[]>(),
      supabaseAdmin.from("welfare_benefit_department").select("benefit_id, department_id").returns<{ benefit_id: string; department_id: string }[]>(),
      fetchUsage([employee.id]),
    ]);
    if (benefits.error) throw benefits.error;
    if (limits.error) throw limits.error;
    if (restrictions.error) throw restrictions.error;

    const rank = (row: { employee_id: string | null; job_level_id: string | null }) => (row.employee_id ? 2 : row.job_level_id ? 1 : 0);
    const best = new Map<string, { amount: number | string; effective_from: string; employee_id: string | null; job_level_id: string | null }>();
    for (const row of limits.data ?? []) {
      const current = best.get(row.benefit_id);
      if (!current || rank(row) > rank(current) || (rank(row) === rank(current) && row.effective_from > current.effective_from)) best.set(row.benefit_id, row);
    }
    const limitOf = new Map([...best].map(([id, row]) => [id, row.amount]));
    const memberOf = [employee.department_id, employee.department?.parent_department_id].filter(Boolean);

    const images = await signBenefitImages((benefits.data ?? []).map((benefit) => benefit.image_path));
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
        maxClaimsNote: maxClaimsLabel(benefit.max_claims, benefit.max_claims_note) || null,
        maxClaims: benefit.max_claims,
        // นับต่อปีของวันที่เกิดค่าใช้จ่าย ตามกฎเดียวกับ guard_welfare_claim
        claimsThisYear: usage.filter((u) => u.benefit_id === benefit.id && u.expense_date.slice(0, 4) === today.slice(0, 4)).length,
        eligibilityNote: benefit.eligibility_note,
        documents: benefit.required_documents ?? [],
        imageUrl: benefit.image_path ? (images.get(benefit.image_path) ?? null) : null,
        allowAdvance: Boolean(benefit.allow_advance),
        advanceReceiptDays: benefit.advance_receipt_days ?? DEFAULT_ADVANCE_RECEIPT_DAYS,
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
  /** ยื่นเบิกล่วงหน้า: ไม่ต้องมีใบเสร็จตอนยื่น แนบภายหลังเมื่อได้รับเงิน */
  advance?: boolean;
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
      throw new ClaimInputError("ยื่นแทนได้เฉพาะหัวหน้า และเฉพาะลูกน้องหรือพนักงานในแผนกของตัวเองที่ยังทำงานอยู่");
    }
  }

  const [ownerId, submitterId, benefits, benefitRow] = await Promise.all([
    findEmployeeUuidByCode(input.employeeCode),
    findEmployeeUuidByCode(actor.sub),
    getEmployeeBenefits(input.employeeCode),
    supabaseAdmin.from("welfare_benefit").select("id, allow_advance, advance_receipt_days").eq("code", input.benefitCode).is("deleted_at", null).maybeSingle(),
  ]);
  const advance = input.advance === true;
  if (benefitRow.error) throw benefitRow.error;
  if (!ownerId || !submitterId) throw new ClaimInputError("ไม่พบข้อมูลพนักงาน");
  if (!benefitRow.data || !benefits?.some((benefit) => benefit.code === input.benefitCode)) {
    throw new ClaimInputError("พนักงานคนนี้ไม่มีสิทธิ์ในสวัสดิการที่เลือก");
  }

  if (input.expenseDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.expenseDate)) throw new ClaimInputError("วันที่เกิดค่าใช้จ่ายไม่ถูกต้อง");
  if (advance && !benefitRow.data.allow_advance) throw new ClaimInputError("สวัสดิการนี้ยื่นเบิกล่วงหน้าไม่ได้");
  // คำขอล่วงหน้าใช้วันที่คาดว่าจะใช้จ่าย จึงเป็นวันในอนาคตได้ (ไม่เกิน 1 ปี)
  if (input.expenseDate && !advance && input.expenseDate > bangkokDate()) throw new ClaimInputError("วันที่เกิดค่าใช้จ่ายต้องไม่อยู่ในอนาคต");
  if (input.expenseDate && advance && input.expenseDate > addDays(bangkokDate(), 365)) throw new ClaimInputError("วันที่คาดว่าจะใช้จ่ายต้องไม่เกิน 1 ปีจากวันนี้");

  const values = {
    is_advance: advance,
    benefit_id: benefitRow.data.id,
    amount_requested: input.amount > 0 ? input.amount : null,
    expense_date: input.expenseDate || null,
    provider_name: input.providerName || null,
    note: input.note || null,
    // ฐานข้อมูลบังคับให้คำขอที่ยื่นแทนมีเหตุผลก่อนส่ง (welfare_claim_proxy_reason_check) ฟอร์มส่งมาไว้ต้นหมายเหตุ
    proxy_reason: input.employeeCode !== actor.sub ? proxyReasonOf(input.note || null) : null,
    details: input.details,
  };

  let claim: { id: string; claim_no: string; status: ClaimDbStatus };
  if (input.claimNo) {
    const existing = await getClaim(input.claimNo);
    if (!existing || (existing.employeeCode !== actor.sub && existing.submittedByCode !== actor.sub)) throw new ClaimInputError("ไม่พบคำขอนี้");
    if (existing.status !== "draft" && existing.status !== "needs_revision") throw new ClaimInputError("คำขอนี้แก้ไขไม่ได้แล้ว");
    if (existing.advance && !advance) throw new ClaimInputError("คำขอนี้ยื่นเป็นเบิกล่วงหน้าแล้ว เปลี่ยนประเภทระหว่างแก้ไขไม่ได้");
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
    if (!advance) {
      if (!count) throw new ClaimInputError("กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์");
      if (!input.receiptNo || !input.receiptDate) throw new ClaimInputError("กรุณาระบุเลขที่และวันที่ในใบเสร็จ");
      if (!input.providerName) throw new ClaimInputError("กรุณาระบุผู้ออกใบเสร็จหรือสถานพยาบาล");
    }

    const { error } = await supabaseAdmin.rpc("welfare_claim_transition", {
      p_claim_id: claim.id,
      p_from: claim.status,
      p_to: "pending_hr",
      p_kind: claim.status === "needs_revision" ? "resubmitted" : "submitted",
      p_actor: submitterId,
      p_actor_role: actor.role,
    });
    if (error) throw error;
    if (advance) {
      // กำหนดแนบใบเสร็จชั่วคราวนับจากวันที่คาดว่าจะใช้จ่าย ตั้งใหม่ตอนการเงินโอนเงิน (recordAdvancePaid)
      const days = benefitRow.data.advance_receipt_days ?? DEFAULT_ADVANCE_RECEIPT_DAYS;
      const { error: advanceError } = await supabaseAdmin
        .from("welfare_claim_advance")
        .upsert({ claim_id: claim.id, advance_amount: input.amount, receipt_due_date: addDays(input.expenseDate || bangkokDate(), days) }, { onConflict: "claim_id" });
      if (advanceError) throw advanceError;
    }
  } catch (err) {
    const message = err instanceof ClaimInputError ? err.message : (err as { code?: string; message?: string }).code === "P0001" ? (err as Error).message : null;
    if (message) throw new ClaimInputError(`${message} (บันทึกเป็น ${claim.claim_no} แล้ว แก้ไขแล้วกดส่งอีกครั้ง)`, claim.claim_no);
    throw err;
  }
  const resubmitted = claim.status === "needs_revision";
  const ownerIsHr = await isHrEmployee(input.employeeCode).catch(() => false);
  const message = {
    subject: `${resubmitted ? "คำขอที่แก้ไขแล้วรอตรวจ" : "คำขอใหม่รอตรวจ"} ${claim.claim_no}`,
    lines: [`${claim.claim_no} · ยอด ${input.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท${advance ? " · เบิกล่วงหน้า" : ""}`, resubmitted ? "ผู้ขอแก้ไขตามที่ส่งกลับแล้ว" : "รอ HR ตรวจสอบ"],
    path: `/hr/home/requests/${encodeURIComponent(claim.claim_no)}`,
  };
  // คำขอของ HR ตรวจได้เฉพาะหัวหน้า HR / HR คนอื่น จึงไม่ส่งถึงเจ้าของและผู้ยื่น
  emailHr(resubmitted ? "claim_resubmitted" : "claim_new", message, { exclude: [input.employeeCode, actor.sub] });
  if (ownerIsHr) emailHr("hr_claim_pending", message, { only: "hr_head", exclude: [input.employeeCode, actor.sub] });
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
  const previous = await getPaySettings();
  const { error } = await supabaseAdmin.from("system_setting").update({ value: settings }).eq("key", "pay_schedule");
  if (error) throw error;
  const { data, error: roundsError } = await supabaseAdmin.from("welfare_pay_round").select("id, year, month, round_no, pay_date").eq("status", "open");
  if (roundsError) throw roundsError;
  for (const round of data ?? []) {
    // รอบที่การเงินเลื่อนวันจ่ายไว้ (วันจ่ายไม่ตรงกับค่าตั้งเดิม) คงวันที่เลื่อนไว้ (ดีไซน์ F07)
    if (round.pay_date !== resolvePayDate(round.year, round.month, round.round_no as 1 | 2, previous)) continue;
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
    if (claim.advance) await recordAdvancePaid(claim);
    return;
  }

  const rule = RULES[input.action];
  if (!rule) throw new ClaimInputError("คำสั่งไม่ถูกต้อง");
  if (!rule.roles.includes(actor.role)) throw new ClaimInputError("ไม่มีสิทธิ์ดำเนินการ");
  if (!rule.from.includes(claim.status)) throw new ClaimInputError("สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่");
  if (rule.needsNote && !note) throw new ClaimInputError(rule.needsNote);
  // HR ตัดสินคำขอของตัวเอง (หรือที่ตัวเองยื่นแทนคนอื่น) ไม่ได้ ต้องให้ HR คนอื่นหรือหัวหน้า HR ตัดสิน
  if (rule.roles.includes("HR") && (claim.employeeCode === actor.sub || claim.submittedByCode === actor.sub)) {
    throw new ClaimInputError("ตัดสินคำขอของตัวเองไม่ได้ ต้องให้ HR คนอื่นหรือหัวหน้า HR ตรวจ");
  }

  let amountApproved: number | null = null;
  let payRoundId: string | null = null;
  // ปรับยอดได้เฉพาะ HR ตอนอนุมัติ (ดีไซน์ H02) การเงินอนุมัติจ่ายตามยอดที่ HR กำหนด
  if (input.action === "hr_approve") {
    amountApproved = input.amountApproved ?? claim.amountRequested;
    if (!(amountApproved > 0) || amountApproved > claim.amountRequested) throw new ClaimInputError("ยอดอนุมัติต้องมากกว่า 0 และไม่เกินยอดขอเบิก");
    if (amountApproved !== claim.amountRequested && !note) throw new ClaimInputError("กรุณาระบุเหตุผลที่ปรับยอด");
  }
  if (input.action === "finance_approve") {
    const hrAmount = claim.amountApproved ?? claim.amountRequested;
    if (input.amountApproved !== undefined && input.amountApproved !== hrAmount) throw new ClaimInputError("การเงินปรับยอดไม่ได้ ถ้ายอดไม่ถูกต้องให้ส่งกลับ HR");
    // ยอดที่ HR อนุมัติบันทึกไว้แล้ว ส่งซ้ำจะทำให้ welfare_claim_transition บันทึก amount_adjusted ที่ไม่มีเหตุผล (ผิด welfare_claim_event_check)
    amountApproved = claim.amountApproved === null ? hrAmount : null;
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
    .select("storage_path, is_restricted, doc_kind, claim:claim_id(claim_no)")
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .maybeSingle()
    .returns<{ storage_path: string; is_restricted: boolean | null; doc_kind: string | null; claim: { claim_no: string } } | null>();
  if (error) throw error;
  if (!data) return null;
  const claim = await getClaim(data.claim.claim_no);
  if (!claim || !canViewClaim(claim, actor)) return null;
  const isRestricted = Boolean(data.is_restricted || data.doc_kind === "medical_certificate");
  if (isRestricted && actor.role !== "HR" && claim.employeeCode !== actor.sub && claim.submittedByCode !== actor.sub) {
    return null;
  }
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

// ─── เบิกล่วงหน้า: โอนเงิน แนบใบเสร็จ และยกเลิกเมื่อเกินกำหนด ───────────────────

/** การเงินโอนเงินล่วงหน้าแล้ว: บันทึกวันที่โอนและนับกำหนดแนบใบเสร็จจากวันนี้ */
async function recordAdvancePaid(claim: ClaimRecord) {
  const { data: benefit } = await supabaseAdmin.from("welfare_benefit").select("advance_receipt_days").eq("code", claim.benefitCode).maybeSingle();
  const days = (benefit?.advance_receipt_days as number | null) ?? DEFAULT_ADVANCE_RECEIPT_DAYS;
  const paidAmount = claim.amountApproved ?? claim.amountRequested;
  const { error } = await supabaseAdmin
    .from("welfare_claim_advance")
    .update({ advance_paid_at: new Date().toISOString(), advance_amount: paidAmount, receipt_due_date: addDays(bangkokDate(), days) })
    .eq("claim_id", claim.id)
    .is("advance_paid_at", null);
  // การโอนบันทึกไปแล้ว ถ้าตั้งกำหนดแนบไม่ได้ให้ตามแก้จาก log กำหนดเดิมยังใช้ได้
  if (error) console.error("[claims] record advance paid failed", { claimNo: claim.claimNo }, error);
}

/** ผู้ขอแนบใบเสร็จจริงของคำขอล่วงหน้า (หลังได้รับเงิน ภายในกำหนด) ส่งให้ HR ตรวจที่หน้า H13 */
export async function submitAdvanceReceipt(
  claimNo: string,
  input: { amount: number; receiptNo: string; receiptDate: string; issuerName: string; files: File[] },
  actor: ClaimActor,
) {
  const claim = await getClaim(claimNo);
  if (!claim || (claim.employeeCode !== actor.sub && claim.submittedByCode !== actor.sub)) throw new ClaimInputError("ไม่พบคำขอนี้");
  const advance = claim.advance;
  if (!advance) throw new ClaimInputError("คำขอนี้ไม่ใช่การเบิกล่วงหน้า");
  if (!advance.advancePaidAt) throw new ClaimInputError("แนบใบเสร็จได้หลังการเงินโอนเงินล่วงหน้าแล้ว");
  if (advance.status !== "awaiting_receipt" && advance.status !== "receipt_returned") throw new ClaimInputError("คำขอนี้ไม่ได้รอใบเสร็จ กรุณาโหลดหน้าใหม่", claimNo);
  if (advance.receiptDueDate < bangkokDate()) throw new ClaimInputError("เกินกำหนดแนบใบเสร็จแล้ว กรุณาติดต่อฝ่ายบุคคล");
  if (!(input.amount > 0)) throw new ClaimInputError("กรุณาระบุยอดตามใบเสร็จ");
  if (!input.receiptNo.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(input.receiptDate)) throw new ClaimInputError("กรุณาระบุเลขที่และวันที่ในใบเสร็จ");
  if (input.receiptDate > bangkokDate()) throw new ClaimInputError("วันที่ในใบเสร็จต้องไม่อยู่ในอนาคต");
  if (!input.issuerName.trim()) throw new ClaimInputError("กรุณาระบุผู้ออกใบเสร็จ");
  if (input.files.length === 0) throw new ClaimInputError("กรุณาแนบใบเสร็จอย่างน้อย 1 ไฟล์");
  assertFiles(input.files);

  const uploaderId = await findEmployeeUuidByCode(actor.sub);
  if (!uploaderId) throw new ClaimInputError("ไม่พบข้อมูลพนักงาน");
  const ids = await uploadAttachments(claim.id, uploaderId, input.files);
  await supabaseAdmin.from("welfare_claim_attachment").update({ doc_kind: "receipt" }).in("id", ids);

  const { error: receiptError } = await supabaseAdmin.from("welfare_claim_receipt").insert({
    claim_id: claim.id,
    receipt_no: input.receiptNo.trim(),
    receipt_date: input.receiptDate,
    issuer_name: input.issuerName.trim(),
    amount: input.amount,
    attachment_id: ids[0] ?? null,
  });
  if (receiptError) throw receiptError;

  const { data: updated, error } = await supabaseAdmin
    .from("welfare_claim_advance")
    .update({ status: "receipt_submitted", receipt_amount: input.amount, receipt_submitted_at: new Date().toISOString() })
    .eq("claim_id", claim.id)
    .eq("status", advance.status)
    .select("id");
  if (error) throw error;
  if (!updated || updated.length === 0) throw new ClaimInputError("คำขอนี้ถูกบันทึกไปแล้ว กรุณาโหลดหน้าใหม่", claimNo);

  const { error: eventError } = await supabaseAdmin.from("welfare_claim_event").insert({
    claim_id: claim.id,
    kind: "receipt_submitted",
    from_status: claim.status,
    to_status: claim.status,
    actor_employee_id: uploaderId,
    actor_role: actor.role,
    note: `ยอดตามใบเสร็จ ${input.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} บาท`,
    amount_before: advance.advanceAmount,
    amount_after: input.amount,
  });
  if (eventError) console.error("[claims] receipt event write failed", { claimNo }, eventError);
  emailHr(
    "advance_receipt",
    { subject: `ใบเสร็จเบิกล่วงหน้ารอตรวจ ${claimNo}`, lines: [`${claimNo} ${claim.benefitName}`, `ยอดล่วงหน้า ${advance.advanceAmount.toLocaleString("th-TH")} บาท · ยอดตามใบเสร็จ ${input.amount.toLocaleString("th-TH")} บาท`], path: `/hr/home/advances/${encodeURIComponent(claimNo)}` },
    { exclude: [claim.employeeCode, actor.sub] },
  );
}

const STATUS_WORD: Partial<Record<ClaimDbStatus, string>> = {
  needs_revision: "HR ส่งกลับให้แก้ไข",
  pending_finance: "HR อนุมัติแล้ว ส่งต่อการเงิน",
  awaiting_payment: "การเงินอนุมัติจ่ายแล้ว รอโอนตามรอบ",
  paid: "โอนเงินแล้ว",
  rejected: "ไม่อนุมัติ",
};

/** HR ที่เปิดอีเมล "สถานะคำขอเบิกของฉัน" ได้อีเมลเมื่อคำขอของตัวเองเปลี่ยนสถานะ */
export async function emailOwnerStatus(claimNo: string, actorCode: string) {
  const claim = await getClaim(claimNo).catch(() => null);
  if (!claim || claim.employeeCode === actorCode) return;
  const word = STATUS_WORD[claim.status];
  if (!word) return;
  emailHr("my_claim_status", { subject: `คำขอ ${claim.claimNo}: ${word}`, lines: [`${claim.claimNo} ${claim.benefitName}`, `สถานะ: ${word}`], path: `/employee/status?id=${encodeURIComponent(claim.claimNo)}` }, { only: [claim.employeeCode] });
}

let lastOverdueSweep = 0;

/**
 * ยกเลิกเงินล่วงหน้าที่เกินกำหนดแนบใบเสร็จ ผู้ขอต้องคืนยอดล่วงหน้าทั้งหมด (สเปก HR ข้อ 4)
 * ฐานข้อมูลไม่มีงานตั้งเวลา จึงเรียกจาก layout ของ HR / การเงิน / พนักงาน และเว้นอย่างน้อย 5 นาทีต่อ process
 */
export async function cancelOverdueAdvances(force = false): Promise<number> {
  if (!force && Date.now() - lastOverdueSweep < 5 * 60 * 1000) return 0;
  lastOverdueSweep = Date.now();
  try {
    const { data, error } = await supabaseAdmin
      .from("welfare_claim_advance")
      .select("id, claim_id, status, advance_amount, claim:claim_id!inner(status, deleted_at)")
      .in("status", ["awaiting_receipt", "receipt_returned"])
      .not("advance_paid_at", "is", null)
      .lt("receipt_due_date", bangkokDate())
      .is("claim.deleted_at", null)
      .returns<{ id: string; claim_id: string; status: string; advance_amount: number | string; claim: { status: ClaimDbStatus } }[]>();
    if (error) throw error;
    let cancelled = 0;
    for (const row of data ?? []) {
      const now = new Date().toISOString();
      const note = "เกินกำหนดแนบใบเสร็จ ระบบยกเลิกอัตโนมัติ ผู้ขอต้องคืนยอดล่วงหน้าทั้งหมด";
      const amount = Number(row.advance_amount);
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("welfare_claim_advance")
        .update({ status: "cancelled_overdue", cancelled_at: now, settlement: "refund", refund_amount: amount, extra_amount_approved: null, review_note: note })
        .eq("id", row.id)
        .eq("status", row.status)
        .select("id");
      if (updateError) throw updateError;
      if (!updated?.length) continue;
      cancelled += 1;
      const { error: eventError } = await supabaseAdmin
        .from("welfare_claim_event")
        .insert({ claim_id: row.claim_id, kind: "advance_cancelled", from_status: row.claim.status, to_status: row.claim.status, actor_employee_id: null, actor_role: "SYSTEM", note, amount_before: amount, amount_after: 0 });
      if (eventError) console.error("[claims] overdue event write failed", { advanceId: row.id }, eventError);
    }
    return cancelled;
  } catch (err) {
    console.error("[claims] overdue advance sweep failed", err);
    return 0;
  }
}
