'use client';

import { useState } from "react";
import type { Organization } from "@/lib/employee/organization";

function PersonIcon() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-muted">
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <circle cx="12" cy="8" r="3.3" />
        <path d="M5.5 20c.4-3.5 2.8-5.5 6.5-5.5s6.1 2 6.5 5.5" />
      </svg>
    </span>
  );
}

function DepartmentIcon({ locked = false }: { locked?: boolean }) {
  return locked ? (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M3.5 19c.4-3.4 2.3-5.2 5.5-5.2s5.1 1.8 5.5 5.2M15 14c2.9-.3 4.7 1.3 5.2 4" />
    </svg>
  );
}

export default function OrganizationClient({ organization }: { organization: Organization }) {
  const { departments, ownDepartmentId } = organization;
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(ownDepartmentId ?? departments[0].id);
  const isOwnDepartment = selectedDepartmentId === ownDepartmentId;
  const selectedDepartment =
    departments.find((department) => department.id === selectedDepartmentId) ??
    departments[0];
  const ownDepartmentName = departments.find((department) => department.id === ownDepartmentId)?.name;
  const head = selectedDepartment.head;

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 px-1 pb-8 text-13 text-ink">
      <div>
        <h1 className="text-22 font-semibold">โครงสร้างองค์กร</h1>
        <p className="mt-1 text-12 text-muted">
          {ownDepartmentName
            ? `ดูโครงสร้างแต่ละฝ่ายและรายชื่อเพื่อนร่วมงานใน${ownDepartmentName}ของคุณ`
            : "ดูโครงสร้างแต่ละฝ่าย · บัญชีของคุณยังไม่ได้ระบุหน่วยงาน"}
        </p>
      </div>

      <aside className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-white p-3">
        <div className="flex items-center gap-3">
          <span className="text-ink-soft">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <path d="M12 3 19 6v5c0 4.5-2.8 7.8-7 10-4.2-2.2-7-5.5-7-10V6l7-3Z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div>
            <h2 className="text-12 font-semibold">
              เห็นรายชื่อเฉพาะพนักงานในแผนกเดียวกัน
            </h2>
            <p className="mt-1 text-11 text-muted">
              เข้าถึงข้อมูลเฉพาะเพื่อนร่วมแผนกของคุณ
              โปรดไม่เปิดเผยชื่อ ตำแหน่ง หรือรหัสพนักงาน
            </p>
          </div>
        </div>
        <span className="rounded bg-primary-50 px-2 py-1 text-11 text-ink-soft">
          {ownDepartmentName ?? "ยังไม่ระบุหน่วยงาน"}
        </span>
      </aside>

      <section className="rounded border border-line bg-white p-4">
        <h2 className="font-semibold">โครงสร้างระดับฝ่าย</h2>

        <div className="mx-auto mt-4 max-w-xs rounded border border-line bg-surface px-4 py-3 text-center">
          <p className="text-12 font-semibold">องค์กร</p>
          <p className="mt-1 text-11 text-muted">หน่วยงานระดับฝ่าย</p>
        </div>

        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {departments.map((department) => {
            const isSelected = selectedDepartmentId === department.id;
            const isOwnDepartment = department.id === ownDepartmentId;

            return (
              <button
                key={department.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => setSelectedDepartmentId(department.id)}
                className={`relative min-h-[112px] rounded border p-3 text-left transition ${
                  isSelected
                    ? "border-primary-600 bg-primary-50"
                    : "border-line bg-white hover:bg-surface"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-4 left-1/2 h-4 border-l border-line"
                />
                <span className="block text-12 font-semibold">
                  {department.name}
                </span>
                <span className="mt-2 block text-11 text-muted">
                  {department.summary}
                </span>
                <span className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-11 text-ink-soft">
                  <DepartmentIcon locked={!isOwnDepartment} />
                  {isOwnDepartment
                    ? "แผนกของฉัน · ดูรายชื่อได้"
                    : "แสดงเฉพาะข้อมูลฝ่าย"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-11 text-muted">
          เลือกแผนกเพื่อดูข้อมูลฝ่าย · ข้อมูลในส่วนอื่นแสดงเฉพาะระดับฝ่าย
        </p>
      </section>

      <section className="rounded border border-line bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">
            {selectedDepartment.name}
          </h2>
          <span className="rounded bg-primary-50 px-2 py-1 text-11 text-ink-soft">
            {isOwnDepartment ? "แสดงรายชื่อภายในฝ่าย" : "แสดงเฉพาะตำแหน่ง"}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-surface p-3">
          <div className="flex items-center gap-3">
            <PersonIcon />
            <div>
              <p className="text-12 font-semibold">
                {isOwnDepartment ? (head?.name ?? "ยังไม่ได้กำหนดผู้จัดการ") : "ผู้จัดการฝ่าย"}
              </p>
              <p className="mt-1 text-11 text-muted">
                ผู้จัดการ{selectedDepartment.name}
                {head?.isMe ? " · คุณ" : head?.isMyManager ? " · ผู้บังคับบัญชาของคุณ" : ""}
              </p>
            </div>
          </div>
          {isOwnDepartment && head && (
            <span className="rounded border border-line bg-white px-2 py-1 text-11">
              ผู้จัดการฝ่าย
            </span>
          )}
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-12">
            <thead>
              <tr className="bg-primary-50 text-ink-soft">
                {isOwnDepartment ? (
                  <>
                    <th className="px-3 py-2 font-medium">พนักงานในฝ่าย</th>
                    <th className="px-3 py-2 font-medium">ตำแหน่ง</th>
                    <th className="px-3 py-2 text-right font-medium">หมายเหตุ</th>
                  </>
                ) : (
                  <th className="px-3 py-2 font-medium">ตำแหน่งในฝ่าย</th>
                )}
              </tr>
            </thead>
            <tbody>
              {selectedDepartment.employees.map((employee) => (
                <tr
                  key={employee.id}
                  className={`border-b border-line ${
                    isOwnDepartment && employee.isCurrentUser
                      ? "bg-surface"
                      : ""
                  }`}
                >
                  {isOwnDepartment ? (
                    <>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <PersonIcon />
                          <span className="font-medium">{employee.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-muted">
                        {employee.role}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {employee.isCurrentUser && (
                          <span className="rounded bg-primary-50 px-2 py-1 text-ink-soft">
                            คุณ
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <td className="px-3 py-2.5 text-ink-soft">
                      {employee.role}
                    </td>
                  )}
                </tr>
              ))}
              {selectedDepartment.employees.length === 0 && (
                <tr>
                  <td colSpan={isOwnDepartment ? 3 : 1} className="px-3 py-6 text-center text-muted">
                    ไม่มีพนักงานอื่นในหน่วยงานนี้
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-11 text-muted">
          {isOwnDepartment
            ? "แสดงเฉพาะพนักงานที่ยังทำงานอยู่ในหน่วยงานเดียวกับคุณ"
            : "เพื่อความเป็นส่วนตัว จะแสดงเฉพาะตำแหน่งโดยไม่เปิดเผยรายชื่อพนักงาน"}
        </p>
      </section>
    </div>
  );
}
