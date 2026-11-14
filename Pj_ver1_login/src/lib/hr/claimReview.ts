import { supabaseAdmin } from "@/lib/supabase";

// ข้อมูลเพิ่มที่หน้า HR ใช้ (อ่านอย่างเดียว) จากคอลัมน์ที่เพิ่มใน migration 20261114120000 / 20261114100000
// แยกจาก lib/claims/service.ts เพื่อไม่กระทบหน้าของ Role อื่น

export type BeneficiaryRelation = "self" | "spouse" | "child" | "parent";
export type DocKind = "receipt" | "medical_certificate" | "insurance_claim" | "certificate" | "other";

export type ClaimReviewFields = {
  proxyReason: string | null;
  beneficiaryRelation: BeneficiaryRelation;
  beneficiaryName: string | null;
  totalCost: number | null;
  insurancePaid: number | null;
  insurerName: string | null;
  /** ประเภทเอกสารตาม id ไฟล์แนบ */
  docKinds: Record<string, DocKind>;
};

const num = (value: number | string | null) => (value === null ? null : Number(value));

export async function getClaimReviewFields(claimId: string): Promise<ClaimReviewFields | null> {
  const [{ data: claim, error }, { data: files }] = await Promise.all([
    supabaseAdmin
      .from("welfare_claim")
      .select("proxy_reason, beneficiary_relation, beneficiary_name, total_cost, insurance_paid, insurer_name")
      .eq("id", claimId)
      .maybeSingle(),
    supabaseAdmin.from("welfare_claim_attachment").select("id, doc_kind").eq("claim_id", claimId).is("deleted_at", null),
  ]);
  if (error || !claim) return null;
  return {
    proxyReason: claim.proxy_reason,
    beneficiaryRelation: claim.beneficiary_relation as BeneficiaryRelation,
    beneficiaryName: claim.beneficiary_name,
    totalCost: num(claim.total_cost),
    insurancePaid: num(claim.insurance_paid),
    insurerName: claim.insurer_name,
    docKinds: Object.fromEntries((files ?? []).map((file) => [file.id, file.doc_kind as DocKind])),
  };
}

/** เหตุผลยื่นแทนและข้อมูลประกันของหลายคำขอ ใช้ในคิว (key = claim id) */
export async function getQueueFields(claimIds: string[]): Promise<Map<string, { proxyReason: string | null; insurancePaid: number | null }>> {
  if (claimIds.length === 0) return new Map();
  const { data } = await supabaseAdmin.from("welfare_claim").select("id, proxy_reason, insurance_paid").in("id", claimIds);
  return new Map((data ?? []).map((row) => [row.id, { proxyReason: row.proxy_reason, insurancePaid: num(row.insurance_paid) }]));
}

/** จำนวนครั้งสูงสุดต่อรอบของแต่ละสวัสดิการ (key = รหัสสวัสดิการ, null = ไม่จำกัด) */
export async function getBenefitMaxClaims(): Promise<Map<string, number | null>> {
  const { data } = await supabaseAdmin.from("welfare_benefit").select("code, max_claims").is("deleted_at", null);
  return new Map((data ?? []).map((row) => [row.code, row.max_claims]));
}
