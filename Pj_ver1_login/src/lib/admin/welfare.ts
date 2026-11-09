import "server-only";
import { supabaseAdmin } from "../supabase";
import type { AuditChanges } from "../auth/audit";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { formatBahtWhole, formatShortThaiDate } from "../format";
import type { BudgetType, WelfareItem, WelfareStatus } from "../../types";

type DbBudgetType = "yearly" | "monthly" | "per_claim";

interface BenefitRow {
  id: string;
  code: string;
  name_th: string;
  budget_type: DbBudgetType;
  max_claims_note: string | null;
  eligibility_note: string | null;
  approver_role_id: string | null;
  required_documents: string[];
  is_active: boolean;
  updated_at: string;
  current_amount: number | string | null;
  current_effective_from: string | null;
  next_amount: number | string | null;
  next_effective_from: string | null;
}

export type WelfareInput = Partial<Pick<WelfareItem, "name" | "amount" | "budgetType" | "maxClaims" | "eligible" | "startDate" | "approver" | "status">>;

/** ข้อความที่แสดงให้ผู้ใช้ได้โดยตรง */
export class WelfareInputError extends Error {}

const COLUMNS =
  "id, code, name_th, budget_type, max_claims_note, eligibility_note, approver_role_id, required_documents, is_active, updated_at, current_amount, current_effective_from, next_amount, next_effective_from";
const BUDGET_LABEL: Record<DbBudgetType, BudgetType> = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };
const BUDGET_DB: Record<BudgetType, DbBudgetType> = { รายปี: "yearly", รายเดือน: "monthly", ต่อครั้ง: "per_claim" };
const STATUS_LABEL: Record<WelfareStatus, string> = { active: "ใช้งาน", inactive: "หยุดใช้" };
export const WELFARE_APPROVER_ROLES: Role[] = ["HR", "FINANCE"];
const CODE_RE = /^WEL-[0-9]{3,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = "Asia/Bangkok";

const bangkokDate = (at: Date = new Date()) => at.toLocaleDateString("sv-SE", { timeZone: TZ });

interface LookupData {
  roleCodeById: Map<string, string>;
  restrictedBenefitIds: Set<string>;
  activeEmployees: number | null;
}

/** ประมาณจากจำนวนพนักงานที่ทำงานอยู่ ไม่คำนวณกรณีต่อครั้ง (ขึ้นกับจำนวนการเบิก) หรือจำกัดแผนก */
function estimateBudget(row: BenefitRow, amount: number, lookup: LookupData): string {
  if (!row.is_active || row.budget_type === "per_claim" || lookup.activeEmployees === null) return "—";
  if (lookup.restrictedBenefitIds.has(row.id)) return "—";
  const perYear = row.budget_type === "monthly" ? amount * 12 : amount;
  return `${formatBahtWhole(perYear * lookup.activeEmployees)}/ปี · ${lookup.activeEmployees} คน`;
}

function toItem(row: BenefitRow, lookup: LookupData): WelfareItem {
  const hasCurrent = row.current_amount !== null;
  const amount = Number(row.current_amount ?? row.next_amount ?? 0);
  return {
    code: row.code,
    name: row.name_th,
    updatedAt: bangkokDate(new Date(row.updated_at)),
    owner: "Admin",
    amount,
    status: row.is_active ? "active" : "inactive",
    budgetType: BUDGET_LABEL[row.budget_type],
    maxClaims: row.max_claims_note ?? "",
    eligible: row.eligibility_note ?? "",
    startDate: row.current_effective_from ?? row.next_effective_from ?? "",
    approver: row.approver_role_id ? (lookup.roleCodeById.get(row.approver_role_id) ?? "") : "",
    estimatedBudget: estimateBudget(row, amount, lookup),
    documents: row.required_documents,
    nextLimit: hasCurrent && row.next_amount !== null && row.next_effective_from ? { amount: Number(row.next_amount), from: row.next_effective_from } : null,
  };
}

async function fetchLookup(): Promise<LookupData> {
  const [roles, departments, employees] = await Promise.all([
    supabaseAdmin.from("app_role").select("id, code"),
    supabaseAdmin.from("welfare_benefit_department").select("benefit_id"),
    supabaseAdmin.from("employee").select("id", { count: "exact", head: true }).eq("employment_status", "active").is("deleted_at", null),
  ]);
  if (roles.error) throw roles.error;
  if (departments.error) throw departments.error;
  return {
    roleCodeById: new Map((roles.data ?? []).map((role) => [role.id as string, role.code as string])),
    restrictedBenefitIds: new Set((departments.data ?? []).map((row) => row.benefit_id as string)),
    // งบโดยประมาณเป็นข้อมูลเสริม โหลดไม่ได้ก็ยังแสดงรายการสวัสดิการได้
    activeEmployees: employees.error ? null : (employees.count ?? 0),
  };
}

/** คืน null เมื่อโหลดไม่สำเร็จ เพื่อให้หน้าจอแจ้งตามจริงแทนการแสดงรายการว่าง */
export async function getWelfareItems(): Promise<WelfareItem[] | null> {
  try {
    const [benefits, lookup] = await Promise.all([
      supabaseAdmin.from("v_welfare_benefit_current").select(COLUMNS).order("code").returns<BenefitRow[]>(),
      fetchLookup(),
    ]);
    if (benefits.error) throw benefits.error;
    return (benefits.data ?? []).map((row) => toItem(row, lookup));
  } catch (err) {
    console.error("[admin welfare] load failed", err);
    return null;
  }
}

/** เก็บเฉพาะฟิลด์ที่แก้ได้ และตรวจชนิดข้อมูลก่อนเขียนลงฐาน */
export function parseWelfareInput(values: unknown): WelfareInput {
  if (typeof values !== "object" || values === null) throw new WelfareInputError("ข้อมูลไม่ถูกต้อง");
  const raw = values as Record<string, unknown>;
  const input: WelfareInput = {};

  for (const key of ["name", "maxClaims", "eligible", "startDate", "approver"] as const) {
    if (key in raw) {
      if (typeof raw[key] !== "string") throw new WelfareInputError("ข้อมูลไม่ถูกต้อง");
      input[key] = (raw[key] as string).trim();
    }
  }
  if ("amount" in raw) {
    if (typeof raw.amount !== "number" || !Number.isFinite(raw.amount)) throw new WelfareInputError("วงเงินไม่ถูกต้อง");
    input.amount = raw.amount;
  }
  if ("budgetType" in raw) {
    if (typeof raw.budgetType !== "string" || !(raw.budgetType in BUDGET_DB)) throw new WelfareInputError("ประเภทวงเงินไม่ถูกต้อง");
    input.budgetType = raw.budgetType as BudgetType;
  }
  if ("status" in raw) {
    if (raw.status !== "active" && raw.status !== "inactive") throw new WelfareInputError("สถานะไม่ถูกต้อง");
    input.status = raw.status;
  }
  return input;
}

function assertRequired(next: WelfareInput) {
  if (!next.name) throw new WelfareInputError("กรุณาระบุชื่อสวัสดิการ");
  if (!(Number(next.amount) > 0)) throw new WelfareInputError("วงเงินต้องมากกว่า 0");
  if (next.approver && !WELFARE_APPROVER_ROLES.includes(next.approver as Role)) throw new WelfareInputError("ผู้อนุมัติไม่ถูกต้อง");
}

function assertStartDate(date: string | undefined) {
  if (!date || !DATE_RE.test(date)) throw new WelfareInputError("กรุณาระบุวันที่เริ่มใช้");
  if (date < bangkokDate()) {
    throw new WelfareInputError("การตั้งหรือปรับวงเงินต้องเลือกวันที่เริ่มใช้ตั้งแต่วันนี้เป็นต้นไป วงเงินเดิมจะเก็บไว้เป็นประวัติ");
  }
}

async function roleIdOf(code: string | undefined): Promise<string | null> {
  if (!code) return null;
  const { data, error } = await supabaseAdmin.from("app_role").select("id").eq("code", code).maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

/** ค่าที่อ่านรู้เรื่องสำหรับ audit_logs */
function auditValue(field: keyof WelfareInput, value: unknown): unknown {
  if (value === "" || value === undefined || value === null) return null;
  if (field === "amount") return formatBahtWhole(Number(value));
  if (field === "startDate") return formatShortThaiDate(String(value));
  if (field === "status") return STATUS_LABEL[value as WelfareStatus];
  if (field === "approver") return ROLE_LABELS[value as Role] ?? value;
  return value;
}

const FIELDS = ["name", "amount", "budgetType", "maxClaims", "eligible", "startDate", "approver", "status"] as const;

function diff(before: WelfareInput, next: WelfareInput): AuditChanges {
  const changes: AuditChanges = {};
  for (const field of FIELDS) {
    if ((before[field] ?? "") !== (next[field] ?? "")) {
      changes[field] = { old: auditValue(field, before[field]), new: auditValue(field, next[field]) };
    }
  }
  return changes;
}

export interface SaveWelfareResult {
  item: WelfareItem;
  created: boolean;
  changes: AuditChanges;
}

async function reload(code: string): Promise<WelfareItem> {
  const item = (await getWelfareItems())?.find((candidate) => candidate.code === code);
  if (!item) throw new Error(`welfare ${code} not found after save`);
  return item;
}

async function createBenefit(code: string, input: WelfareInput): Promise<SaveWelfareResult> {
  if (!CODE_RE.test(code)) throw new WelfareInputError("รหัสสวัสดิการไม่ถูกต้อง");
  if (!input.budgetType) throw new WelfareInputError("กรุณาเลือกประเภทวงเงิน");
  assertRequired(input);
  assertStartDate(input.startDate);

  const { data, error } = await supabaseAdmin
    .from("welfare_benefit")
    .insert({
      code,
      name_th: input.name,
      budget_type: BUDGET_DB[input.budgetType],
      max_claims_note: input.maxClaims || null,
      eligibility_note: input.eligible || null,
      approver_role_id: await roleIdOf(input.approver),
      // สร้างแล้วยังไม่เปิดให้เบิก จนกว่า Admin จะกดเปิดใช้งาน
      is_active: input.status === "active",
    })
    .select("id")
    .single();
  if (error) throw error;

  const limit = await supabaseAdmin.from("welfare_benefit_limit").insert({ benefit_id: data.id, amount: input.amount, effective_from: input.startDate });
  if (limit.error) throw limit.error;

  return { item: await reload(code), created: true, changes: diff({}, input) };
}

/** มีวงเงินที่รอมีผลอยู่แล้วให้แก้แถวนั้น ไม่งั้นเพิ่มแถวใหม่ (แถวที่มีผลแล้วแก้ไม่ได้) */
async function writeLimit(row: BenefitRow, amount: number, startDate: string) {
  const { error } = row.next_effective_from
    ? await supabaseAdmin
        .from("welfare_benefit_limit")
        .update({ amount, effective_from: startDate })
        .eq("benefit_id", row.id)
        .eq("effective_from", row.next_effective_from)
    : await supabaseAdmin.from("welfare_benefit_limit").insert({ benefit_id: row.id, amount, effective_from: startDate });
  if (error) throw error;
}

export async function saveWelfareItem(code: string, input: WelfareInput): Promise<SaveWelfareResult> {
  const { data: row, error } = await supabaseAdmin
    .from("v_welfare_benefit_current")
    .select(COLUMNS)
    .eq("code", code)
    .maybeSingle()
    .returns<BenefitRow | null>();
  if (error) throw error;
  if (!row) return createBenefit(code, input);

  const lookup = await fetchLookup();
  const before = toItem(row, lookup);
  const next: WelfareInput = { ...before, ...input };
  assertRequired(next);

  const changes = diff(before, next);
  if (Object.keys(changes).length === 0) return { item: before, created: false, changes };

  if (changes.amount || changes.startDate) {
    assertStartDate(next.startDate);
    await writeLimit(row, Number(next.amount), next.startDate as string);
  }

  const { error: updateError } = await supabaseAdmin
    .from("welfare_benefit")
    .update({
      name_th: next.name,
      budget_type: BUDGET_DB[next.budgetType as BudgetType],
      max_claims_note: next.maxClaims || null,
      eligibility_note: next.eligible || null,
      approver_role_id: await roleIdOf(next.approver),
      is_active: next.status === "active",
    })
    .eq("id", row.id);
  if (updateError) throw updateError;

  return { item: await reload(code), created: false, changes };
}
