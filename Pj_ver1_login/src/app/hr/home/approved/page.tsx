import type { Metadata } from "next";
import { getHrEmployees } from "@/lib/hr/employees";
import { readRequestFilters } from "../../urlFilters";
import { StatusList } from "../StatusList";
import { getStatusRows } from "../statusRows";

export const metadata: Metadata = { title: "คำขอที่อนุมัติแล้ว" };

export const dynamic = "force-dynamic";

export default async function ApprovedRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [employees, params, data] = await Promise.all([getHrEmployees(), searchParams, getStatusRows("approved")]);
  if (!data) return <p className="queue-alert" role="alert">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  return <StatusList kind="approved" rows={data.rows} counts={data.counts} employees={employees} initialFilters={readRequestFilters(params)} />;
}
