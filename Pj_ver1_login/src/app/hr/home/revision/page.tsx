import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { readRequestFilters } from "../../urlFilters";
import { StatusList } from "../StatusList";
import { getStatusRows } from "../statusRows";

export const metadata: Metadata = { title: "คำขอที่รอพนักงานแก้ไข" };

export const dynamic = "force-dynamic";

export default async function RevisionRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [employees, params, data] = await Promise.all([getHrEmployees(), searchParams, getStatusRows("revision")]);
  if (!data) return <p className="queue-alert" role="alert">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  return <StatusList kind="revision" rows={data.rows} counts={data.counts} employees={employees} initialFilters={readRequestFilters(params)} />;
}
