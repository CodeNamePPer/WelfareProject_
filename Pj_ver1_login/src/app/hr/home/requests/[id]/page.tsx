import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getHrEmployees } from "@/lib/hr/employees";
import { findRequest } from "../../../sample/requests";
import { RequestDetailClient } from "./RequestDetailClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `คำขอ ${decodeURIComponent(id)}` };
}

export default async function RequestDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const detail = findRequest(decodeURIComponent(id));
  if (!detail) notFound();

  const [employees, session] = await Promise.all([getHrEmployees(), getSession()]);
  const byCode = new Map((employees ?? []).map((employee) => [employee.code, employee]));
  const actor = detail.decision ? byCode.get(detail.decision.actorCode) ?? null : null;

  return (
    <RequestDetailClient
      detail={detail}
      employee={byCode.get(detail.request.employeeCode) ?? null}
      employeesFailed={employees === null}
      actorName={actor?.name ?? detail.decision?.actorCode ?? null}
      viewerCode={session?.sub ?? null}
    />
  );
}
