import type { Metadata } from "next";
import { listClaims } from "@/lib/claims/service";
import { ADMIN_STATUSES, toAdminClaim } from "@/lib/claims/mappers";
import { fetchEmployees } from "@/lib/admin/dashboard";
import { AdminClaimsClient } from "./AdminClaimsClient";

export const metadata: Metadata = { title: "คำขอเบิกทั้งหมด" };
export const dynamic = "force-dynamic";

export default async function AdminClaimsPage() {
  const [claims, employees] = await Promise.all([listClaims({ statuses: ADMIN_STATUSES }), fetchEmployees()]);
  if (!claims) return <p className="text-13 text-status-rejected">โหลดคำขอเบิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  return <AdminClaimsClient claims={claims.map(toAdminClaim)} employees={employees ?? []} />;
}
