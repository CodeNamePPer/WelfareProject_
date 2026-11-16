import type { Metadata } from "next";
import { BenefitDetailScreen } from "@/app/hr/benefits/[code]/view";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  return { title: `สวัสดิการ ${decodeURIComponent(code)}` };
}

// รายละเอียดสวัสดิการ หน้าเดียวกับของ HR · Admin เสนอแก้ไขผ่านหัวหน้า HR
export default async function AdminBenefitDetailPage({ params }: { params: Params }) {
  const { code } = await params;
  return <BenefitDetailScreen code={code} base="/admin" />;
}
