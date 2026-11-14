import type { BudgetType, ProposalInput } from "./proposals";

const BUDGETS: BudgetType[] = ["yearly", "monthly", "per_claim"];

/** แปลง body ของฟอร์มเสนอสวัสดิการเป็น ProposalInput (ค่าผิดรูปแบบกลายเป็นค่าว่าง ให้ validateProposal แจ้ง) */
export function parseProposalInput(raw: unknown): ProposalInput {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (key: string) => (typeof body[key] === "string" ? (body[key] as string) : "");
  const flag = (key: string) => body[key] === true;
  const limits = Array.isArray(body.limits)
    ? body.limits.map((item) => {
        const row = (item ?? {}) as { levelId?: unknown; amount?: unknown };
        return { levelId: typeof row.levelId === "string" ? row.levelId : null, amount: typeof row.amount === "number" ? row.amount : Number.NaN };
      })
    : [];
  const documents = Array.isArray(body.documents) ? body.documents.filter((doc): doc is string => typeof doc === "string" && doc.trim().length > 0) : [];
  return {
    name: text("name"),
    category: text("category"),
    description: text("description"),
    detail: text("detail"),
    imagePath: text("imagePath") || null,
    budgetType: BUDGETS.includes(body.budgetType as BudgetType) ? (body.budgetType as BudgetType) : "yearly",
    limits,
    maxClaims: typeof body.maxClaims === "number" ? body.maxClaims : null,
    effectiveFrom: text("effectiveFrom"),
    allowFamily: flag("allowFamily"),
    allowInsurance: flag("allowInsurance"),
    allowAdvance: flag("allowAdvance"),
    documents,
    reason: text("reason"),
  };
}
