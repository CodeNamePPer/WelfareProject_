import type { Metadata } from "next";
import { ProposeScreen } from "@/app/hr/benefits/propose/view";

export const metadata: Metadata = { title: "เสนอสวัสดิการ" };
export const dynamic = "force-dynamic";

// ฟอร์มเสนอสวัสดิการ 4 ขั้น (H04) เดียวกับ HR · ?draft=<id> แก้ฉบับร่าง · ?edit=<code> เสนอแก้ไข
export default async function AdminProposePage({ searchParams }: { searchParams: Promise<{ draft?: string; edit?: string }> }) {
  return <ProposeScreen params={await searchParams} base="/admin" />;
}
