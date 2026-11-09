import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getOrganization } from "@/lib/employee/organization";
import OrganizationClient from "./OrganizationClient";

export default async function OrganizationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const organization = await getOrganization(session.sub);
  if (!organization || organization.departments.length === 0) {
    return <p className="text-13 text-status-rejected">โหลดโครงสร้างองค์กรไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>;
  }

  return <OrganizationClient organization={organization} />;
}
