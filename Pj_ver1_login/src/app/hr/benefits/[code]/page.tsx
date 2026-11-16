import type { Metadata } from "next";
import { BenefitDetailScreen } from "./view";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  return { title: `สวัสดิการ ${decodeURIComponent(code)}` };
}

export default async function BenefitDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  return <BenefitDetailScreen code={code} base="/hr" />;
}
