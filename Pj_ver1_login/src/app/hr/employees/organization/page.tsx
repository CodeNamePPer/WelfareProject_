import type { Metadata } from "next";
import { getOrgPeople } from "@/lib/hr/orgChart";
import { HrPage } from "@/features/hr/ui";
import { OrgChartClient } from "./OrgChartClient";

export const metadata: Metadata = { title: "โครงสร้างองค์กร" };
export const dynamic = "force-dynamic";

// H11 โครงสร้างองค์กร: จากตาราง employee และ department
export default async function HrOrgChartPage() {
  const people = await getOrgPeople();
  if (!people) return <p className="text-13 text-status-rejected-ink">โหลดโครงสร้างองค์กรไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>;
  return (
    <HrPage>
      <OrgChartClient people={people} />
    </HrPage>
  );
}
