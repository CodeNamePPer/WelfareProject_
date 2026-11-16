import type { Metadata } from "next";
import { getSession } from "@/lib/auth/get-session";
import { getHrHeadCode } from "@/lib/hr/hrHead";
import { ProposeScreen } from "./view";

export async function generateMetadata(): Promise<Metadata> {
  const [session, headCode] = await Promise.all([getSession(), getHrHeadCode()]);
  const isHead = session?.role === "HR" && headCode !== null && session.sub === headCode;
  return { title: isHead ? "สวัสดิการ" : "เสนอสวัสดิการ" };
}
export const dynamic = "force-dynamic";

export default async function ProposePage({ searchParams }: { searchParams: Promise<{ draft?: string; edit?: string }> }) {
  return <ProposeScreen params={await searchParams} base="/hr" />;
}
