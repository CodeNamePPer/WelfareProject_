import type { Metadata } from "next";
import { MyProposalView } from "./view";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "ข้อเสนอสวัสดิการ" };
}

export default async function MyProposalPage({ params }: { params: Params }) {
  const { id } = await params;
  return <MyProposalView id={id} base="/hr" />;
}
