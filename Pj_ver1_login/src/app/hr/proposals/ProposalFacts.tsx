import type { BudgetType, ProposalDetail, ProposalStatus } from "@/lib/hr/proposals";
import { Card, type BadgeTone } from "@/features/hr/ui";

const BUDGET_LABEL: Record<BudgetType, string> = { yearly: "รายปี", monthly: "รายเดือน", per_claim: "ต่อครั้ง" };

// รายละเอียดที่เสนอ (HH2) ใช้ทั้งหน้าหัวหน้า HR และหน้าผู้เสนอ
export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: BadgeTone }> = {
  draft: { label: "ร่าง", tone: "neutral" },
  pending: { label: "รออนุมัติ", tone: "review" },
  needs_info: { label: "ขอข้อมูลเพิ่ม", tone: "revise" },
  approved: { label: "อนุมัติแล้ว", tone: "approved" },
  rejected: { label: "ไม่อนุมัติ", tone: "rejected" },
  withdrawn: { label: "ถอนแล้ว", tone: "neutral" },
};

export const thaiDate = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00+07:00` : iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }) : "—";
const money = (value: number) => `฿${value.toLocaleString("th-TH", { maximumFractionDigits: 2 })}`;

/** แบ่งวงเงินเป็นคู่ "L1 / L2" "L3 / L4" ตามดีไซน์ */
function limitPairs(limits: ProposalDetail["levelLimits"]) {
  const pairs: { label: string; value: string }[] = [];
  for (let index = 0; index < limits.length; index += 2) {
    const group = limits.slice(index, index + 2);
    pairs.push({ label: `วงเงิน ${group.map((limit) => limit.levelCode ?? "ทุกระดับ").join(" / ")}`, value: group.map((limit) => money(limit.amount)).join(" / ") });
  }
  return pairs;
}

export function ProposalFacts({ proposal }: { proposal: ProposalDetail }) {
  const input = proposal.input;
  const facts = [
    { label: "หมวด", value: input.category || "—" },
    { label: "รอบวงเงิน", value: BUDGET_LABEL[input.budgetType] },
    { label: "จำนวนครั้ง", value: input.maxClaims ? `${input.maxClaims} ครั้ง/ปี` : "ไม่จำกัด" },
    ...limitPairs(proposal.levelLimits),
    { label: "มีผล", value: thaiDate(input.effectiveFrom || null) },
    { label: "ครอบครัว", value: input.allowFamily ? "เบิกได้" : "ไม่ได้" },
    { label: "ส่วนเกินประกัน", value: input.allowInsurance ? "เบิกได้" : "ไม่ได้" },
    { label: "เบิกล่วงหน้า", value: input.allowAdvance ? "เบิกได้" : "ไม่ได้" },
  ];
  return (
    <Card className="p-5">
      <h2 className="mb-3 text-16 font-semibold">รายละเอียดที่เสนอ</h2>
      <dl className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0">
            <dt className="text-12 text-muted">{fact.label}</dt>
            <dd className="text-14 break-words">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {input.detail ? (
        <div className="mt-3.5">
          <p className="text-12 text-muted">รายละเอียดเต็ม</p>
          <p className="text-14 whitespace-pre-line">{input.detail}</p>
        </div>
      ) : null}
      <div className="mt-3.5">
        <p className="text-12 text-muted">เอกสารที่ต้องแนบ</p>
        <p className="text-14">{input.documents.join(", ") || "—"}</p>
      </div>
      {input.reason ? (
        <p className="mt-3.5 rounded-[8px] bg-[#F8FAFC] px-3 py-2.5 text-13">
          <b className="font-semibold">เหตุผลที่เสนอ:</b> {input.reason}
        </p>
      ) : null}
    </Card>
  );
}
