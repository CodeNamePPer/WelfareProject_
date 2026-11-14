import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllUsersWithProfile, getOrgOptions, getUserWithProfileById } from "@/lib/auth/users";
import { ButtonLink, HrPage, PageHeader } from "@/features/hr/ui";
import { EditEmployeeClient } from "./EditEmployeeClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `แก้ไขข้อมูลพนักงาน ${decodeURIComponent(id)}` };
}

export default async function EditEmployeePage({ params }: { params: Params }) {
  const { id } = await params;
  const code = decodeURIComponent(id);

  const [user, orgOptions, allUsers] = await Promise.all([
    getUserWithProfileById(code),
    getOrgOptions(),
    getAllUsersWithProfile(),
  ]);

  if (!user) notFound();

  const managerChoices = allUsers
    .filter((u) => u.status === "ACTIVE" && u.employeeId !== user.employeeId)
    .map((u) => ({ value: u.employeeId, label: `${u.name} (${u.employeeId})` }));

  const subtitle = [
    user.employeeId,
    user.profile.positionName,
    user.profile.departmentName,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <HrPage>
      <PageHeader
        crumbs={[
          { label: "จัดการพนักงานและสิทธิ์", href: "/hr/employees" },
          { label: user.employeeId, href: `/hr/employees/${encodeURIComponent(user.employeeId)}` },
          { label: "แก้ไขข้อมูล" },
        ]}
        title={`แก้ไขข้อมูลพนักงาน · ${user.name}`}
        description={subtitle || "ปรับปรุงข้อมูลส่วนตัว ครอบครัว การติดต่อ และการทำงาน"}
        actions={
          <ButtonLink href={`/hr/employees/${encodeURIComponent(user.employeeId)}`} variant="secondary">
            กลับไปโปรไฟล์พนักงาน
          </ButtonLink>
        }
      />

      <EditEmployeeClient
        initialUser={user}
        orgOptions={orgOptions}
        managerChoices={managerChoices}
      />
    </HrPage>
  );
}
