import "server-only";
import { supabaseAdmin } from "@/lib/supabase";
import { findEmployeeUuidByCode } from "@/lib/auth/users";

// ข้อเสนอสร้างสวัสดิการ (ดีไซน์ H03, H04, H14, HH1, HH2)
//   HR เสนอ -> หัวหน้า HR อนุมัติ (สร้างสวัสดิการทันที) / ขอข้อมูลเพิ่ม (HR แก้แล้วส่งกลับ) / ไม่อนุมัติ
//   หัวหน้า HR สร้างสวัสดิการเองได้โดยไม่ต้องเสนอ (createBenefitDirect)
// ตาราง: welfare_benefit_proposal, welfare_benefit_proposal_limit, welfare_benefit_proposal_event

export type ProposalStatus = "draft" | "pending" | "needs_info" | "approved" | "rejected" | "withdrawn";
export type ProposalKind = "create" | "update" | "close";
export type BudgetType = "yearly" | "monthly" | "per_claim";

export const BENEFIT_IMAGE_BUCKET = "welfare-benefit-images";
export const BUDGET_LABEL: Record<BudgetType, string> = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };

export type ProposalInput = {
  name: string;
  category: string;
  /** คำอธิบายสั้นบนการ์ด (ไม่เกิน 80 ตัวอักษร) */
  description: string;
  detail: string;
  imagePath: string | null;
  budgetType: BudgetType;
  /** วงเงินตามระดับ (levelId null = ทุกระดับ) */
  limits: { levelId: string | null; amount: number }[];
  maxClaims: number | null;
  effectiveFrom: string;
  allowFamily: boolean;
  allowInsurance: boolean;
  allowAdvance: boolean;
  documents: string[];
  reason: string;
};

export class ProposalError extends Error {
  constructor(
    message: string,
    readonly field?: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });

/** ตรวจข้อมูลข้อเสนอ ใช้ทั้งตอนบันทึกร่าง (draft = ตรวจน้อย) และตอนส่ง */
export function validateProposal(input: ProposalInput, mode: "draft" | "submit") {
  if (!input.name.trim()) throw new ProposalError("กรอกชื่อสวัสดิการ", "name");
  if (input.description.length > 80) throw new ProposalError("คำอธิบายสั้นไม่เกิน 80 ตัวอักษร", "description");
  for (const limit of input.limits) {
    if (!Number.isFinite(limit.amount) || limit.amount < 0) throw new ProposalError("วงเงินต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป", "limits");
  }
  if (input.maxClaims !== null && (!Number.isInteger(input.maxClaims) || input.maxClaims < 1)) throw new ProposalError("จำนวนครั้งต้องเป็นจำนวนเต็มตั้งแต่ 1", "maxClaims");
  if (mode === "draft") return;
  if (!input.category.trim()) throw new ProposalError("เลือกหมวด", "category");
  if (!input.description.trim()) throw new ProposalError("กรอกคำอธิบายสั้นบนการ์ด", "description");
  if (!input.imagePath) throw new ProposalError("อัปโหลดรูปประกอบ", "image");
  if (input.limits.length === 0 || input.limits.every((limit) => limit.amount <= 0)) throw new ProposalError("กรอกวงเงินอย่างน้อย 1 ระดับ", "limits");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom)) throw new ProposalError("เลือกวันที่มีผล", "effectiveFrom");
  if (input.effectiveFrom < today()) throw new ProposalError("วันที่มีผลต้องเป็นวันนี้หรือหลังจากนี้", "effectiveFrom");
  if (input.documents.length === 0) throw new ProposalError("เพิ่มเอกสารที่ต้องแนบอย่างน้อย 1 รายการ", "documents");
  if (!input.reason.trim()) throw new ProposalError("ระบุเหตุผลที่เสนอ", "reason");
}

function proposalRow(input: ProposalInput) {
  return {
    name_th: input.name.trim(),
    category: input.category.trim() || null,
    description: input.description.trim() || null,
    detail: input.detail.trim() || null,
    image_path: input.imagePath,
    budget_type: input.budgetType,
    max_claims: input.maxClaims,
    effective_from: /^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) ? input.effectiveFrom : null,
    allow_family: input.allowFamily,
    allow_insurance_excess: input.allowInsurance,
    allow_advance: input.allowAdvance,
    eligibility: { all_departments: true },
    required_documents: input.documents.map((doc) => doc.trim()).filter(Boolean),
    reason: input.reason.trim() || null,
  };
}

async function uuidOf(code: string) {
  const id = await findEmployeeUuidByCode(code);
  if (!id) throw new ProposalError("ไม่พบผู้ใช้", undefined, 403);
  return id;
}

async function writeLimits(proposalId: string, limits: ProposalInput["limits"]) {
  const del = await supabaseAdmin.from("welfare_benefit_proposal_limit").delete().eq("proposal_id", proposalId);
  if (del.error) throw del.error;
  const rows = limits.filter((limit) => limit.amount > 0).map((limit) => ({ proposal_id: proposalId, job_level_id: limit.levelId, amount: limit.amount }));
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin.from("welfare_benefit_proposal_limit").insert(rows);
  if (error) throw error;
}

async function addEvent(proposalId: string, kind: string, actorId: string, actorRole: string, note: string | null, snapshot?: unknown) {
  const { error } = await supabaseAdmin
    .from("welfare_benefit_proposal_event")
    .insert({ proposal_id: proposalId, kind, actor_employee_id: actorId, actor_role: actorRole, note, snapshot: snapshot ?? null });
  if (error) throw error;
}

/** HR เสนอสร้างสวัสดิการใหม่ (submit = ส่งให้หัวหน้า HR เลย, ไม่งั้นเป็นร่าง) */
export async function createProposal(input: ProposalInput, actor: { code: string; role: "HR" | "SUPER_ADMIN" }, submit: boolean) {
  validateProposal(input, submit ? "submit" : "draft");
  const actorId = await uuidOf(actor.code);
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .insert({
      ...proposalRow(input),
      kind: "create",
      status: submit ? "pending" : "draft",
      submitted_at: submit ? new Date().toISOString() : null,
      proposed_by: actorId,
      proposer_role: actor.role,
    })
    .select("id, proposal_no")
    .single();
  if (error) throw error;
  await writeLimits(data.id, input.limits);
  if (submit) await addEvent(data.id, "submitted", actorId, actor.role, input.reason.trim(), input);
  return { id: data.id as string, proposalNo: data.proposal_no as string };
}

type OwnRow = { id: string; status: ProposalStatus; proposed_by: string; proposer_role: string };

async function loadOwn(id: string, actorCode: string): Promise<OwnRow & { actorId: string }> {
  const actorId = await uuidOf(actorCode);
  const { data, error } = await supabaseAdmin.from("welfare_benefit_proposal").select("id, status, proposed_by, proposer_role").eq("id", id).is("deleted_at", null).maybeSingle<OwnRow>();
  if (error) throw error;
  if (!data) throw new ProposalError("ไม่พบข้อเสนอ", undefined, 404);
  if (data.proposed_by !== actorId) throw new ProposalError("แก้ได้เฉพาะข้อเสนอของคุณ", undefined, 403);
  return { ...data, actorId };
}

/** ผู้เสนอแก้ข้อเสนอ (ร่าง หรือหลังหัวหน้า HR ขอข้อมูลเพิ่ม) แล้วส่ง */
export async function reviseProposal(id: string, input: ProposalInput, actorCode: string, submit: boolean, message: string) {
  const own = await loadOwn(id, actorCode);
  if (own.status !== "draft" && own.status !== "needs_info") throw new ProposalError("ข้อเสนอนี้แก้ไม่ได้แล้ว", undefined, 409);
  validateProposal(input, submit ? "submit" : "draft");
  const { error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .update({
      ...proposalRow(input),
      status: submit ? "pending" : own.status,
      submitted_at: submit ? new Date().toISOString() : null,
      // ส่งกลับแล้วเริ่มรอการตัดสินใหม่
      ...(submit ? { decided_by: null, decided_at: null, decision_note: null } : {}),
    })
    .eq("id", id);
  if (error) throw error;
  await writeLimits(id, input.limits);
  if (submit) await addEvent(id, own.status === "needs_info" ? "revised" : "submitted", own.actorId, own.proposer_role, message.trim() || input.reason.trim(), input);
}

export async function withdrawProposal(id: string, actorCode: string, note: string) {
  const own = await loadOwn(id, actorCode);
  if (!["draft", "pending", "needs_info"].includes(own.status)) throw new ProposalError("ข้อเสนอนี้ถอนไม่ได้แล้ว", undefined, 409);
  const { error } = await supabaseAdmin.from("welfare_benefit_proposal").update({ status: "withdrawn" }).eq("id", id);
  if (error) throw error;
  await addEvent(id, "withdrawn", own.actorId, own.proposer_role, note.trim() || null);
}

/** รหัสสวัสดิการถัดไป WEL-014, WEL-015, ... */
async function nextBenefitCode() {
  const { data, error } = await supabaseAdmin.from("welfare_benefit").select("code");
  if (error) throw error;
  const max = (data ?? []).reduce((top, row) => Math.max(top, Number(row.code.slice(4)) || 0), 0);
  return `WEL-${String(max + 1).padStart(3, "0")}`;
}

/** สร้างสวัสดิการจริงพร้อมวงเงินกลางและวงเงินตามระดับ */
async function insertBenefit(input: ProposalInput) {
  const code = await nextBenefitCode();
  const notes = [input.allowFamily ? "เบิกให้ครอบครัวได้" : null, input.allowInsurance ? "เบิกส่วนเกินจากประกันได้" : null].filter(Boolean).join(" · ");
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit")
    .insert({
      code,
      name_th: input.name.trim(),
      description: input.description.trim() || null,
      detail: input.detail.trim() || null,
      category: input.category.trim() || null,
      image_path: input.imagePath,
      budget_type: input.budgetType,
      max_claims: input.maxClaims,
      form_type: "general",
      eligibility_note: notes || null,
      required_documents: input.documents,
      allow_advance: input.allowAdvance,
      is_active: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  // วงเงินกลาง (ใช้กับคนที่ไม่มีระดับ): ใช้ยอด "ทุกระดับ" ถ้ามี ไม่งั้นใช้ยอดต่ำสุดของระดับที่กรอก
  const positive = input.limits.filter((limit) => limit.amount > 0);
  const central = positive.find((limit) => limit.levelId === null)?.amount ?? Math.min(...positive.map((limit) => limit.amount));
  const rows = [
    { benefit_id: data.id, amount: central, effective_from: input.effectiveFrom, reason: "สร้างสวัสดิการ" },
    ...positive.filter((limit) => limit.levelId !== null).map((limit) => ({ benefit_id: data.id, job_level_id: limit.levelId, amount: limit.amount, effective_from: input.effectiveFrom, reason: "สร้างสวัสดิการ" })),
  ];
  const limitInsert = await supabaseAdmin.from("welfare_benefit_limit").insert(rows);
  if (limitInsert.error) throw limitInsert.error;
  return { id: data.id as string, code };
}

/** หัวหน้า HR สร้างสวัสดิการเองโดยไม่ต้องเสนอ */
export async function createBenefitDirect(input: ProposalInput) {
  validateProposal(input, "submit");
  return insertBenefit(input);
}

/** หัวหน้า HR ตัดสินข้อเสนอที่รออนุมัติ */
export async function decideProposal(id: string, decision: "approve" | "needs_info" | "reject", note: string, actorCode: string) {
  const actorId = await uuidOf(actorCode);
  const detail = await getProposal(id);
  if (!detail) throw new ProposalError("ไม่พบข้อเสนอ", undefined, 404);
  if (detail.status !== "pending") throw new ProposalError("ข้อเสนอนี้ไม่ได้รออนุมัติแล้ว", undefined, 409);
  if (detail.proposedById === actorId) throw new ProposalError("อนุมัติข้อเสนอของตัวเองไม่ได้", undefined, 403);
  if (decision !== "approve" && !note.trim()) throw new ProposalError(decision === "needs_info" ? "ระบุสิ่งที่ต้องการให้แก้" : "ระบุเหตุผลที่ไม่อนุมัติ", "note");
  if (detail.kind !== "create") throw new ProposalError("ยังรองรับเฉพาะข้อเสนอสร้างสวัสดิการใหม่", undefined, 409);

  let applied: { id: string; code: string } | null = null;
  if (decision === "approve") {
    const input = detail.input;
    validateProposal({ ...input, effectiveFrom: input.effectiveFrom < today() ? today() : input.effectiveFrom }, "submit");
    applied = await insertBenefit({ ...input, effectiveFrom: input.effectiveFrom < today() ? today() : input.effectiveFrom });
  }
  const status: ProposalStatus = decision === "approve" ? "approved" : decision === "needs_info" ? "needs_info" : "rejected";
  const { error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .update({ status, decided_by: actorId, decided_at: new Date().toISOString(), decision_note: note.trim() || null, applied_benefit_id: applied?.id ?? null })
    .eq("id", id);
  if (error) throw error;
  await addEvent(id, decision === "approve" ? "approved" : decision === "needs_info" ? "info_requested" : "rejected", actorId, "HR_HEAD", note.trim() || null);
  return { status, benefitCode: applied?.code ?? null };
}

// -----------------------------------------------------------------------------
// อ่าน
// -----------------------------------------------------------------------------

type Person = { employee_code: string; first_name_th: string; last_name_th: string; position: { name_th: string } | null } | null;
const nameOf = (person: Person) => (person ? `${person.first_name_th} ${person.last_name_th}` : "—");

export type ProposalSummary = {
  id: string;
  proposalNo: string;
  kind: ProposalKind;
  status: ProposalStatus;
  name: string;
  category: string | null;
  imagePath: string | null;
  proposerName: string;
  proposerRole: "HR" | "SUPER_ADMIN";
  submittedAt: string | null;
  /** เช่น "฿3,000–6,000 / ปี" */
  limitLabel: string;
};

type SummaryRow = {
  id: string;
  proposal_no: string;
  kind: ProposalKind;
  status: ProposalStatus;
  name_th: string | null;
  category: string | null;
  image_path: string | null;
  budget_type: BudgetType | null;
  proposer_role: "HR" | "SUPER_ADMIN";
  submitted_at: string | null;
  benefit: { name_th: string } | null;
  proposer: Person;
  limits: { amount: number | string }[];
};

const SUMMARY_SELECT =
  "id, proposal_no, kind, status, name_th, category, image_path, budget_type, proposer_role, submitted_at, benefit:benefit_id(name_th), proposer:proposed_by(employee_code, first_name_th, last_name_th, position:position_id(name_th)), limits:welfare_benefit_proposal_limit(amount)";

const PER: Record<BudgetType, string> = { yearly: "ปี", monthly: "เดือน", per_claim: "ครั้ง" };
const baht = (value: number) => value.toLocaleString("th-TH", { maximumFractionDigits: 2 });

export function limitLabel(amounts: number[], budget: BudgetType | null) {
  if (amounts.length === 0) return "—";
  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  return `฿${min === max ? baht(min) : `${baht(min)}–${baht(max)}`}${budget ? ` / ${PER[budget]}` : ""}`;
}

function toSummary(row: SummaryRow): ProposalSummary {
  return {
    id: row.id,
    proposalNo: row.proposal_no,
    kind: row.kind,
    status: row.status,
    name: row.name_th ?? row.benefit?.name_th ?? "—",
    category: row.category,
    imagePath: row.image_path,
    proposerName: nameOf(row.proposer),
    proposerRole: row.proposer_role,
    submittedAt: row.submitted_at,
    limitLabel: limitLabel(row.limits.map((limit) => Number(limit.amount)), row.budget_type),
  };
}

/** ข้อเสนอตามสถานะ ใหม่สุดก่อน คืน null เมื่อโหลดไม่สำเร็จ */
export async function listProposals(statuses: ProposalStatus[]): Promise<ProposalSummary[] | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .select(SUMMARY_SELECT)
    .in("status", statuses)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<SummaryRow[]>();
  if (error) {
    console.error("[hr proposals] load failed", error);
    return null;
  }
  return (data ?? []).map(toSummary);
}

/** ข้อเสนอที่ยังเปิดอยู่ (ร่าง รออนุมัติ ขอข้อมูลเพิ่ม) */
export const getOpenProposals = () => listProposals(["draft", "pending", "needs_info"]);

export async function countPendingProposals(): Promise<number> {
  const { count } = await supabaseAdmin.from("welfare_benefit_proposal").select("id", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null);
  return count ?? 0;
}

export type ProposalDetail = ProposalSummary & {
  proposedById: string;
  proposerCode: string | null;
  proposerPosition: string | null;
  input: ProposalInput;
  /** วงเงินพร้อมชื่อระดับ เรียงตามระดับ */
  levelLimits: { levelId: string | null; levelCode: string | null; levelName: string | null; amount: number }[];
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  appliedBenefitCode: string | null;
  /** ข้อความล่าสุดที่หัวหน้า HR ขอข้อมูลเพิ่ม */
  infoRequest: { by: string; at: string; note: string } | null;
};

type DetailRow = SummaryRow & {
  proposed_by: string;
  description: string | null;
  detail: string | null;
  max_claims: number | null;
  effective_from: string | null;
  allow_family: boolean;
  allow_insurance_excess: boolean;
  allow_advance: boolean;
  required_documents: string[];
  reason: string | null;
  decision_note: string | null;
  decided_at: string | null;
  decider: Person;
  applied: { code: string } | null;
  level_limits: { amount: number | string; job_level_id: string | null; level: { code: string; name_th: string; rank_order: number } | null }[];
  events: { kind: string; note: string | null; created_at: string; actor: Person }[];
};

export async function getProposal(id: string): Promise<ProposalDetail | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .select(
      `${SUMMARY_SELECT}, proposed_by, description, detail, max_claims, effective_from, allow_family, allow_insurance_excess, allow_advance, required_documents, reason, decision_note, decided_at,
       decider:decided_by(employee_code, first_name_th, last_name_th, position:position_id(name_th)), applied:applied_benefit_id(code),
       level_limits:welfare_benefit_proposal_limit(amount, job_level_id, level:job_level_id(code, name_th, rank_order)),
       events:welfare_benefit_proposal_event(kind, note, created_at, actor:actor_employee_id(employee_code, first_name_th, last_name_th, position:position_id(name_th)))`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle<DetailRow>();
  if (error) {
    console.error("[hr proposals] detail failed", error);
    return null;
  }
  if (!data) return null;
  const levelLimits = data.level_limits
    .map((limit) => ({ levelId: limit.job_level_id, levelCode: limit.level?.code ?? null, levelName: limit.level?.name_th ?? null, amount: Number(limit.amount), rank: limit.level?.rank_order ?? 0 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ rank: _rank, ...rest }) => rest);
  const ask = [...data.events].filter((event) => event.kind === "info_requested").sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    ...toSummary(data),
    proposedById: data.proposed_by,
    proposerCode: data.proposer?.employee_code ?? null,
    proposerPosition: data.proposer?.position?.name_th ?? null,
    input: {
      name: data.name_th ?? "",
      category: data.category ?? "",
      description: data.description ?? "",
      detail: data.detail ?? "",
      imagePath: data.image_path,
      budgetType: data.budget_type ?? "yearly",
      limits: levelLimits.map((limit) => ({ levelId: limit.levelId, amount: limit.amount })),
      maxClaims: data.max_claims,
      effectiveFrom: data.effective_from ?? "",
      allowFamily: data.allow_family,
      allowInsurance: data.allow_insurance_excess,
      allowAdvance: data.allow_advance,
      documents: data.required_documents,
      reason: data.reason ?? "",
    },
    levelLimits,
    decisionNote: data.decision_note,
    decidedByName: data.decider ? nameOf(data.decider) : null,
    decidedAt: data.decided_at,
    appliedBenefitCode: data.applied?.code ?? null,
    infoRequest: ask ? { by: nameOf(ask.actor), at: ask.created_at, note: ask.note ?? "" } : null,
  };
}

/** ตัวเลือกของฟอร์ม: หมวดที่มีอยู่ และระดับตำแหน่ง */
export async function getProposalOptions() {
  const [{ data: categories }, { data: levels }] = await Promise.all([
    supabaseAdmin.from("welfare_benefit").select("category").is("deleted_at", null),
    supabaseAdmin.from("job_level").select("id, code, name_th, rank_order").eq("is_active", true).is("deleted_at", null).order("rank_order"),
  ]);
  const names = [...new Set((categories ?? []).map((row) => row.category).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "th"));
  return {
    categories: names,
    levels: (levels ?? []).map((level) => ({ id: level.id as string, code: level.code as string, name: level.name_th as string })),
  };
}

/** ลิงก์ชั่วคราวของรูปประกอบ (bucket เป็น private) */
export async function signedImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage.from(BENEFIT_IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

/** ผลกระทบงบประมาณโดยประมาณ (HH2): พนักงานที่มีสิทธิ์ และวงเงินรวมสูงสุดถ้าใช้เต็มทุกคน */
export async function estimateBudget(levelLimits: ProposalDetail["levelLimits"]) {
  const { data } = await supabaseAdmin.from("employee").select("job_level_id").eq("employment_status", "active").is("deleted_at", null);
  const employees = data ?? [];
  const byLevel = new Map(levelLimits.filter((limit) => limit.levelId).map((limit) => [limit.levelId, limit.amount]));
  const central = levelLimits.find((limit) => limit.levelId === null)?.amount ?? (levelLimits.length ? Math.min(...levelLimits.map((limit) => limit.amount)) : 0);
  const total = employees.reduce((sum, employee) => sum + (byLevel.get(employee.job_level_id) ?? central), 0);
  return { eligible: employees.length, total };
}
