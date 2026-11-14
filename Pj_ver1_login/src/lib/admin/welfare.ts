import "server-only";
import { supabaseAdmin } from "../supabase";
import type { AuditChanges } from "../auth/audit";
import { ROLE_LABELS, type Role } from "../auth/roles";
import { formatBahtWhole, formatShortThaiDate } from "../format";
import { FORM_FIELDS, FORM_TYPE_LABELS, maxClaimsLabel } from "../claims/forms";
import type { BudgetType, WelfareItem, WelfareStatus } from "../../types";

type DbBudgetType = "yearly" | "monthly" | "per_claim";

interface BenefitExtraRow {
  id: string;
  form_type: string | null;
  category: string | null;
  description: string | null;
  detail: string | null;
  image_path: string | null;
  allow_advance: boolean | null;
}

interface LevelLimitRow {
  benefit_id: string;
  job_level_id: string;
  amount: number | string;
  level: { code: string; name_th: string; rank_order: number } | null;
}

interface BenefitRow {
  id: string;
  code: string;
  name_th: string;
  budget_type: DbBudgetType;
  max_claims: number | null;
  max_claims_note: string | null;
  /** ไม่อยู่ใน v_welfare_benefit_current จึงอ่านจาก welfare_benefit แยก */
  form_type?: string | null;
  category?: string | null;
  description?: string | null;
  detail?: string | null;
  image_path?: string | null;
  allow_advance?: boolean | null;
  levelLimits?: WelfareItem["levelLimits"];
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

export type WelfareInput = Partial<Pick<WelfareItem, "name" | "amount" | "budgetType" | "maxClaimsPerYear" | "formType" | "eligible" | "startDate" | "approver" | "status" | "documents">>;

/** ข้อความที่แสดงให้ผู้ใช้ได้โดยตรง */
export class WelfareInputError extends Error {}

const COLUMNS =
  "id, code, name_th, budget_type, max_claims, max_claims_note, eligibility_note, approver_role_id, required_documents, is_active, updated_at, current_amount, current_effective_from, next_amount, next_effective_from";
const BUDGET_LABEL: Record<DbBudgetType, BudgetType> = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };
const BUDGET_DB: Record<BudgetType, DbBudgetType> = { รายปี: "yearly", รายเดือน: "monthly", ต่อครั้ง: "per_claim" };
const STATUS_LABEL: Record<WelfareStatus, string> = { active: "ใช้งาน", inactive: "หยุดใช้" };
export const WELFARE_APPROVER_ROLES: Role[] = ["HR", "FINANCE"];
const CODE_RE = /^WEL-[0-9]{3,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ = "Asia/Bangkok";
const MAX_DOCUMENTS = 10;
const MAX_DOCUMENT_NAME = 120;
const MAX_CLAIMS_PER_YEAR = 365;

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
  const eligible = row.eligibility_note ?? "";
  return {
    id: row.id,
    code: row.code,
    name: row.name_th,
    category: row.category ?? "",
    description: row.description ?? "",
    detail: row.detail ?? "",
    imagePath: row.image_path ?? null,
    allowAdvance: Boolean(row.allow_advance),
    allowFamily: eligible.includes("เบิกให้ครอบครัวได้"),
    allowInsurance: eligible.includes("เบิกส่วนเกินจากประกันได้"),
    levelLimits: row.levelLimits ?? [],
    updatedAt: bangkokDate(new Date(row.updated_at)),
    owner: "Admin",
    amount,
    status: row.is_active ? "active" : "inactive",
    budgetType: BUDGET_LABEL[row.budget_type],
    maxClaims: maxClaimsLabel(row.max_claims, row.max_claims_note),
    maxClaimsPerYear: row.max_claims,
    formType: row.form_type && row.form_type in FORM_FIELDS ? row.form_type : "general",
    eligible,
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
    const [benefits, extras, levelRows, lookup] = await Promise.all([
      supabaseAdmin.from("v_welfare_benefit_current").select(COLUMNS).order("code").returns<BenefitRow[]>(),
      supabaseAdmin
        .from("welfare_benefit")
        .select("id, form_type, category, description, detail, image_path, allow_advance")
        .is("deleted_at", null)
        .returns<BenefitExtraRow[]>(),
      supabaseAdmin
        .from("welfare_benefit_limit")
        .select("benefit_id, job_level_id, amount, level:job_level_id(code, name_th, rank_order)")
        .is("employee_id", null)
        .not("job_level_id", "is", null)
        .is("effective_to", null)
        .is("deleted_at", null)
        .returns<LevelLimitRow[]>(),
      fetchLookup(),
    ]);
    if (benefits.error) throw benefits.error;
    let extraRows = extras.data ?? [];
    if (extras.error) {
      const fallback = await supabaseAdmin
        .from("welfare_benefit")
        .select("id, form_type, category, description")
        .is("deleted_at", null)
        .returns<BenefitExtraRow[]>();
      extraRows = fallback.data ?? [];
    }
    const extraOf = new Map(extraRows.map((row) => [row.id, row]));
    const limitsByBenefit = new Map<string, { levelId: string; code: string; name: string; amount: number; rank: number }[]>();
    for (const row of levelRows.data ?? []) {
      if (!row.job_level_id || !row.level) continue;
      const list = limitsByBenefit.get(row.benefit_id) ?? [];
      list.push({
        levelId: row.job_level_id,
        code: row.level.code,
        name: row.level.name_th,
        amount: Number(row.amount),
        rank: row.level.rank_order ?? 0,
      });
      limitsByBenefit.set(row.benefit_id, list);
    }
    return (benefits.data ?? []).map((row) => {
      const extra = extraOf.get(row.id);
      const levelLimits = (limitsByBenefit.get(row.id) ?? []).sort((a, b) => a.rank - b.rank).map(({ rank: _rank, ...rest }) => rest);
      return toItem(
        {
          ...row,
          form_type: extra?.form_type,
          category: extra?.category,
          description: extra?.description,
          detail: extra?.detail,
          image_path: extra?.image_path,
          allow_advance: extra?.allow_advance,
          levelLimits,
        },
        lookup,
      );
    });
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

  for (const key of ["name", "eligible", "startDate", "approver"] as const) {
    if (key in raw) {
      if (typeof raw[key] !== "string") throw new WelfareInputError("ข้อมูลไม่ถูกต้อง");
      input[key] = (raw[key] as string).trim();
    }
  }
  if ("amount" in raw) {
    if (typeof raw.amount !== "number" || !Number.isFinite(raw.amount)) throw new WelfareInputError("วงเงินไม่ถูกต้อง");
    input.amount = raw.amount;
  }
  if ("maxClaimsPerYear" in raw) {
    const count = raw.maxClaimsPerYear;
    if (count !== null && (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > MAX_CLAIMS_PER_YEAR)) {
      throw new WelfareInputError(`จำนวนครั้งที่เบิกได้ต่อปีต้องเป็นจำนวนเต็ม 1–${MAX_CLAIMS_PER_YEAR} หรือเว้นว่างเมื่อไม่จำกัด`);
    }
    input.maxClaimsPerYear = count;
  }
  if ("formType" in raw) {
    if (typeof raw.formType !== "string" || !(raw.formType in FORM_FIELDS)) throw new WelfareInputError("แบบฟอร์มยื่นคำขอไม่ถูกต้อง");
    input.formType = raw.formType;
  }
  if ("budgetType" in raw) {
    if (typeof raw.budgetType !== "string" || !(raw.budgetType in BUDGET_DB)) throw new WelfareInputError("ประเภทวงเงินไม่ถูกต้อง");
    input.budgetType = raw.budgetType as BudgetType;
  }
  if ("documents" in raw) {
    const list = raw.documents;
    if (!Array.isArray(list) || list.some((name) => typeof name !== "string")) throw new WelfareInputError("รายการเอกสารไม่ถูกต้อง");
    const names = [...new Set((list as string[]).map((name) => name.trim()).filter(Boolean))];
    if (names.length > MAX_DOCUMENTS) throw new WelfareInputError(`กำหนดเอกสารได้ไม่เกิน ${MAX_DOCUMENTS} รายการ`);
    if (names.some((name) => name.length > MAX_DOCUMENT_NAME)) throw new WelfareInputError(`ชื่อเอกสารแต่ละรายการยาวได้ไม่เกิน ${MAX_DOCUMENT_NAME} ตัวอักษร`);
    input.documents = names;
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
  if (field === "documents") return (value as string[]).join(", ") || null;
  if (field === "maxClaimsPerYear") return `${value} ครั้ง/ปี`;
  if (field === "formType") return FORM_TYPE_LABELS[value as string] ?? value;
  if (field === "amount") return formatBahtWhole(Number(value));
  if (field === "startDate") return formatShortThaiDate(String(value));
  if (field === "status") return STATUS_LABEL[value as WelfareStatus];
  if (field === "approver") return ROLE_LABELS[value as Role] ?? value;
  return value;
}

const FIELDS = ["name", "amount", "budgetType", "maxClaimsPerYear", "formType", "eligible", "startDate", "approver", "status", "documents"] as const;

// รายการเอกสารเป็นอาร์เรย์ เทียบด้วยค่าข้างใน
const comparable = (value: unknown) => (Array.isArray(value) ? value.join("\n") : (value ?? ""));

function diff(before: WelfareInput, next: WelfareInput): AuditChanges {
  const changes: AuditChanges = {};
  for (const field of FIELDS) {
    if (comparable(before[field]) !== comparable(next[field])) {
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
      max_claims: input.maxClaimsPerYear ?? null,
      form_type: input.formType ?? "general",
      eligibility_note: input.eligible || null,
      approver_role_id: await roleIdOf(input.approver),
      required_documents: input.documents ?? [],
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

  const form = await supabaseAdmin.from("welfare_benefit").select("form_type").eq("id", row.id).single();
  if (form.error) throw form.error;
  row.form_type = form.data.form_type as string | null;

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
      max_claims: next.maxClaimsPerYear ?? null,
      // กำหนดเป็นตัวเลขแล้ว ข้อความเงื่อนไขเดิมไม่ใช้อีก
      ...(changes.maxClaimsPerYear && next.maxClaimsPerYear ? { max_claims_note: null } : {}),
      form_type: next.formType ?? "general",
      eligibility_note: next.eligible || null,
      approver_role_id: await roleIdOf(next.approver),
      required_documents: next.documents ?? [],
      is_active: next.status === "active",
    })
    .eq("id", row.id);
  if (updateError) throw updateError;

  return { item: await reload(code), created: false, changes };
}
