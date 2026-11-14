'use client';

import { useState } from "react";
import { Lock } from "lucide-react";
import type { Organization } from "@/lib/employee/organization";
import { cx } from "@/lib/cx";
import { PageHead, Pill, Sheet } from "@/features/requester/ui";

/** ตัวอักษรแรกของชื่อและนามสกุล ข้ามคำนำหน้าและสระหน้า */
function initialsOf(name: string) {
  const parts = name.replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.)/, "").trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((part) => part.match(/[ก-ฮA-Za-z]/)?.[0] ?? "")
    .join("");
}

/** การ์ดบุคคลในผัง ถ้าไม่มีชื่อ (แผนกอื่น) แสดงเฉพาะตำแหน่ง */
function PersonCard({ name, role, note, highlight = false }: { name?: string; role: string; note?: string; highlight?: boolean }) {
  return (
    <div className={cx("flex w-[230px] max-w-full items-center gap-2.5 rounded-lg bg-white p-3", highlight ? "border-2 border-primary-600 bg-primary-50" : "border border-line")}>
      <span
        aria-hidden="true"
        className={cx("flex size-10 shrink-0 items-center justify-center rounded-full text-13 font-semibold", highlight ? "bg-primary-100 text-primary-700" : "bg-mist text-ink-soft")}
      >
        {name ? initialsOf(name) : <Lock className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-13 font-semibold">{name ?? role}</span>
        {name ? <span className="block truncate text-12 text-muted">{role}</span> : null}
        {note ? <span className="block truncate text-11 text-muted">{note}</span> : null}
      </span>
    </div>
  );
}

const Stem = () => <div aria-hidden="true" className="mx-auto h-6 w-0.5 bg-slate-300" />;

export default function OrganizationClient({ organization }: { organization: Organization }) {
  const { departments, ownDepartmentId } = organization;
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(ownDepartmentId ?? departments[0].id);
  const isOwnDepartment = selectedDepartmentId === ownDepartmentId;
  const selectedDepartment = departments.find((department) => department.id === selectedDepartmentId) ?? departments[0];
  const ownDepartmentName = departments.find((department) => department.id === ownDepartmentId)?.name;
  const head = selectedDepartment.head;

  return (
    <>
      <PageHead
        title="โครงสร้างองค์กร"
        description={ownDepartmentName ? `ข้อมูลจากระบบ HR · พนักงานที่ทำงานอยู่ · แผนกของคุณ: ${ownDepartmentName}` : "ข้อมูลจากระบบ HR · บัญชีของคุณยังไม่ได้ระบุหน่วยงาน"}
      />

      <Sheet aria-labelledby="org-departments" className="flex flex-col gap-3 p-5">
        <h2 id="org-departments" className="text-16 font-semibold">
          หน่วยงานระดับฝ่าย
        </h2>
        <div role="group" aria-label="เลือกหน่วยงาน" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((department) => {
            const selected = selectedDepartmentId === department.id;
            const own = department.id === ownDepartmentId;
            return (
              <button
                key={department.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedDepartmentId(department.id)}
                className={cx(
                  "flex flex-col gap-1 rounded-lg px-3.5 py-3 text-left transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  selected ? "border-[1.5px] border-primary-600 bg-primary-50" : "border border-line bg-white hover:bg-surface",
                )}
              >
                <span className="font-semibold">{department.name}</span>
                <span className="text-12 text-muted">{department.summary}</span>
                <span className={cx("text-12", own ? "text-primary-700" : "text-muted")}>{own ? "แผนกของฉัน · ดูรายชื่อได้" : "แสดงเฉพาะตำแหน่ง"}</span>
              </button>
            );
          })}
        </div>
      </Sheet>

      <Sheet aria-labelledby="org-chart" className="flex flex-col items-center px-5 py-7">
        <div className="mb-5 flex w-full flex-wrap items-center justify-between gap-2">
          <h2 id="org-chart" className="text-16 font-semibold">
            {selectedDepartment.name}
          </h2>
          <Pill tone={isOwnDepartment ? "blue" : "slate"}>{isOwnDepartment ? "แสดงรายชื่อภายในฝ่าย" : "แสดงเฉพาะตำแหน่ง"}</Pill>
        </div>

        <PersonCard
          name={isOwnDepartment ? (head ? `${head.name}${head.isMe ? " (คุณ)" : ""}` : "ยังไม่ได้กำหนดผู้จัดการ") : undefined}
          role={`ผู้จัดการ${selectedDepartment.name}`}
          note={head?.isMyManager ? "ผู้บังคับบัญชาของคุณ" : undefined}
          highlight={Boolean(head?.isMe)}
        />

        {selectedDepartment.employees.length > 0 ? (
          <>
            <Stem />
            <div aria-hidden="true" className="h-0.5 w-[780px] max-w-full bg-slate-300" />
            <ul className="flex flex-wrap justify-center gap-x-6">
              {selectedDepartment.employees.map((employee) => (
                <li key={employee.id} className="flex flex-col items-center">
                  <Stem />
                  <PersonCard
                    name={isOwnDepartment && employee.name ? `${employee.name}${employee.isCurrentUser ? " (คุณ)" : ""}` : undefined}
                    role={employee.role}
                    note={isOwnDepartment ? employee.id : undefined}
                    highlight={isOwnDepartment && Boolean(employee.isCurrentUser)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-4 text-13 text-muted">ไม่มีพนักงานอื่นในหน่วยงานนี้</p>
        )}
      </Sheet>

      <Sheet className="flex flex-wrap gap-x-6 gap-y-1 px-[18px] py-3.5 text-13">
        <span>
          <b className="font-semibold">แผนกของคุณ:</b> {ownDepartmentName ?? "ยังไม่ระบุ"}
        </span>
        <span className="text-muted">
          {isOwnDepartment ? "แสดงเฉพาะพนักงานที่ยังทำงานอยู่ในหน่วยงานเดียวกับคุณ" : "เพื่อความเป็นส่วนตัว แผนกอื่นแสดงเฉพาะตำแหน่งโดยไม่เปิดเผยรายชื่อพนักงาน"}
        </span>
      </Sheet>
    </>
  );
}
