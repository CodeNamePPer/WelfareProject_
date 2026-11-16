import type { Metadata } from "next";
import { MyProposalView } from "@/app/hr/benefits/proposals/[id]/view";

export const metadata: Metadata = { title: "ข้อเสนอสวัสดิการ" };
export const dynamic = "force-dynamic";

// ข้อเสนอของ Admin (H14) · หัวหน้า HR ขอข้อมูลเพิ่ม แก้แล้วส่งกลับได้ที่หน้านี้
export default async function AdminProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MyProposalView id={id} base="/admin" />;
}
