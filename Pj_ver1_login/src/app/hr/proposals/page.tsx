import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { isHrHead } from "@/lib/hr/hrHead";
import { listProposals, signedImageUrl } from "@/lib/hr/proposals";
import { supabaseAdmin } from "@/lib/supabase";
import { HrPage } from "@/features/hr/ui";
import { ProposalQueueClient, type QueueProposal } from "./ProposalQueueClient";

export const metadata: Metadata = { title: "อนุมัติสวัสดิการใหม่" };
export const dynamic = "force-dynamic";

// HH1 คิวข้อเสนอสวัสดิการใหม่ (จาก HR และ Admin) เฉพาะหัวหน้า HR
export default async function ProposalQueuePage() {
  const session = await getSession();
  if (!(await isHrHead(session))) redirect("/hr/home");

  const [proposals, { count: activeBenefits }] = await Promise.all([
    listProposals(["pending", "needs_info", "approved", "rejected"]),
    supabaseAdmin.from("welfare_benefit").select("id", { count: "exact", head: true }).eq("is_active", true).is("deleted_at", null),
  ]);
  if (!proposals) return <p className="text-13 text-status-rejected-ink">โหลดข้อเสนอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;

  const rows: QueueProposal[] = await Promise.all(proposals.map(async (proposal) => ({ ...proposal, imageUrl: await signedImageUrl(proposal.imagePath) })));
  const year = new Date().getFullYear().toString();
  const pending = rows.filter((row) => row.status === "pending");
  const stats = [
    {
      label: "รออนุมัติ",
      value: String(pending.length),
      note: `จาก HR ${pending.filter((row) => row.proposerRole === "HR").length} · Admin ${pending.filter((row) => row.proposerRole === "SUPER_ADMIN").length}`,
      warn: true,
    },
    { label: "ขอข้อมูลเพิ่ม", value: String(rows.filter((row) => row.status === "needs_info").length), note: "รอผู้เสนอแก้" },
    {
      label: "อนุมัติแล้วปีนี้",
      value: String(rows.filter((row) => row.status === "approved" && (row.submittedAt ?? "").startsWith(year)).length),
      note: `สวัสดิการที่เปิดใช้ ${activeBenefits ?? 0}`,
    },
  ];

  return (
    <HrPage>
      <ProposalQueueClient rows={rows} stats={stats} />
    </HrPage>
  );
}
