import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

// ข้อเสนอสร้าง/แก้ไข/ปิดสวัสดิการ (ตาราง welfare_benefit_proposal) อ่านอย่างเดียว
export type ProposalStatus = "draft" | "pending" | "needs_info" | "approved" | "rejected" | "withdrawn";
export type ProposalKind = "create" | "update" | "close";

export type ProposalSummary = {
  id: string;
  proposalNo: string;
  kind: ProposalKind;
  status: ProposalStatus;
  name: string;
  proposerName: string;
  proposerRole: "HR" | "SUPER_ADMIN";
  submittedAt: string | null;
};

type Row = {
  id: string;
  proposal_no: string;
  kind: ProposalKind;
  status: ProposalStatus;
  name_th: string | null;
  proposer_role: "HR" | "SUPER_ADMIN";
  submitted_at: string | null;
  benefit: { name_th: string } | null;
  proposer: { first_name_th: string; last_name_th: string } | null;
};

/** ข้อเสนอที่ยังเปิดอยู่ (ร่าง รออนุมัติ ขอข้อมูลเพิ่ม) ใหม่สุดก่อน คืน null เมื่อโหลดไม่สำเร็จ */
export async function getOpenProposals(): Promise<ProposalSummary[] | null> {
  const { data, error } = await supabaseAdmin
    .from("welfare_benefit_proposal")
    .select("id, proposal_no, kind, status, name_th, proposer_role, submitted_at, benefit:benefit_id(name_th), proposer:proposed_by(first_name_th, last_name_th)")
    .in("status", ["draft", "pending", "needs_info"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  if (error) {
    console.error("[hr proposals] load failed", error);
    return null;
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    proposalNo: row.proposal_no,
    kind: row.kind,
    status: row.status,
    name: row.name_th ?? row.benefit?.name_th ?? "—",
    proposerName: row.proposer ? `${row.proposer.first_name_th} ${row.proposer.last_name_th}` : "—",
    proposerRole: row.proposer_role,
    submittedAt: row.submitted_at,
  }));
}
