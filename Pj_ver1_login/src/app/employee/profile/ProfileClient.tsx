'use client';

import Link from "next/link";
import { useState } from "react";
import { Lock } from "lucide-react";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import type { MyProfile } from "@/lib/employee/profile";
import { cx } from "@/lib/cx";
import { Pill, Sheet, pill } from "@/features/requester/ui";

/** ตาราง employee ยังไม่ได้กรอกข้อมูลช่องนี้ */
const EMPTY = "—";

const TABS = [
  { id: "personal", label: "ข้อมูลส่วนตัว" },
  { id: "work", label: "การทำงาน" },
  { id: "security", label: "ความปลอดภัย" },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** ช่องที่ระบบกำหนด แก้ไขเองไม่ได้ */
function LockedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-13 font-medium text-muted">{label}</p>
      <div className="relative">
        <Lock className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          readOnly
          aria-readonly="true"
          aria-label={`${label} (แก้ไขไม่ได้)`}
          value={value}
          className="h-[42px] w-full cursor-not-allowed rounded-lg border border-line bg-slate-100 pr-3 pl-[34px] text-14 text-muted outline-none"
        />
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-12 text-muted">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export default function ProfileClient({ profile, roleLabel }: { profile: MyProfile; roleLabel: string }) {
  const [tab, setTab] = useState<TabId>("personal");

  return (
    <>
      <Sheet aria-label="โปรไฟล์" className="overflow-hidden">
        <div className="h-24 bg-blue-900" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-6">
          <div className="flex flex-wrap items-end gap-4">
            <div aria-hidden="true" className="-mt-[52px] flex size-[104px] shrink-0 items-center justify-center rounded-full border-4 border-white bg-primary-100 text-[32px] font-semibold text-primary-700">
              {profile.initials}
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="text-22 font-semibold">{profile.name}</h1>
              <p className="text-14 text-ink-soft">{[profile.position, profile.department].filter(Boolean).join(" · ") || "ยังไม่ระบุตำแหน่ง"}</p>
              <p className="text-12 text-muted">
                {profile.code}
                {profile.managerName ? ` · หัวหน้า: ${profile.managerName}` : ""}
              </p>
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                <Pill tone="blue">{roleLabel}</Pill>
                <Pill tone="green">{profile.statusLabel}</Pill>
              </p>
            </div>
          </div>
          <Link href="/employee/withdraw" className={cx(pill.primary, "mb-2")}>
            ยื่นคำขอ
          </Link>
        </div>
        <div role="tablist" aria-label="ส่วนของโปรไฟล์" className="mt-4 flex flex-wrap gap-1 border-t border-line px-4 text-14">
          {TABS.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                id={`profile-tab-${item.id}`}
                aria-selected={selected}
                aria-controls={`profile-panel-${item.id}`}
                onClick={() => setTab(item.id)}
                className={cx("border-b-2 px-2.5 py-3 transition-colors motion-reduce:transition-none", selected ? "border-primary-600 font-semibold text-ink" : "border-transparent text-muted hover:text-ink")}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </Sheet>

      <div role="tabpanel" id={`profile-panel-${tab}`} aria-labelledby={`profile-tab-${tab}`} className="flex flex-col gap-4">
        {tab === "personal" ? (
          <>
            <Sheet className="flex flex-col gap-3.5 p-5">
              <div>
                <h2 className="text-16 font-semibold">ข้อมูลที่ระบบกำหนด</h2>
                <p className="text-12 text-muted">แก้ไขไม่ได้ ติดต่อ HR ถ้าข้อมูลไม่ถูกต้อง</p>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <LockedField label="ชื่อ-นามสกุล" value={profile.name} />
                <LockedField label="รหัสพนักงาน" value={profile.code} />
                <LockedField label="อีเมลเข้าสู่ระบบ" value={profile.email} />
                <LockedField label="วันเริ่มงาน" value={profile.hireDate} />
                <LockedField label="สถานะ" value={profile.statusLabel} />
              </div>
            </Sheet>

            <Sheet className="flex flex-col gap-3.5 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-16 font-semibold">ข้อมูลติดต่อ</h2>
                  <p className="text-12 text-muted">ส่งคำขอแล้ว HR ตรวจก่อนบันทึกจริง</p>
                </div>
                <Link href="/employee/profile/changeprofile" className={pill.outline}>
                  ส่งคำขอแก้ไขข้อมูล
                </Link>
              </div>
              <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <Fact label="โทรศัพท์">{profile.phone ?? EMPTY}</Fact>
                <Fact label="ผู้ติดต่อฉุกเฉิน">{profile.emergencyContact ?? EMPTY}</Fact>
                <div className="sm:col-span-2">
                  <Fact label="ที่อยู่">{profile.address ?? EMPTY}</Fact>
                </div>
              </dl>
            </Sheet>

            <Sheet className="p-5">
              <h2 className="mb-2 text-16 font-semibold">การแก้ไขล่าสุด</h2>
              {profile.lastEdit ? (
                <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-3">
                  <Fact label="วันที่และเวลา">{profile.lastEdit.at} น.</Fact>
                  <Fact label="ผู้แก้ไขข้อมูล">
                    {profile.lastEdit.editorName ?? "ระบบ"}
                    {profile.lastEdit.editorPosition ? ` · ${profile.lastEdit.editorPosition}` : ""}
                  </Fact>
                  <Fact label="เหตุผล">{profile.lastEdit.reason ?? EMPTY}</Fact>
                </dl>
              ) : (
                <p className="text-13 text-muted">ยังไม่มีประวัติการแก้ไขข้อมูล</p>
              )}
            </Sheet>
          </>
        ) : null}

        {tab === "work" ? (
          <Sheet className="p-5">
            <h2 className="mb-3 text-16 font-semibold">การทำงาน</h2>
            <dl className="grid gap-x-4 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <Fact label="แผนก">{profile.department ?? EMPTY}</Fact>
              <Fact label="ตำแหน่ง">{profile.position ?? EMPTY}</Fact>
              <Fact label="หัวหน้าโดยตรง">{profile.managerName ?? EMPTY}</Fact>
              <Fact label="วันเริ่มงาน">{profile.hireDate}</Fact>
              <Fact label="สถานะ">{profile.statusLabel}</Fact>
              <Fact label="บทบาทในระบบ">{roleLabel}</Fact>
            </dl>
            <p className="mt-4 border-t border-slate-100 pt-3 text-12 text-muted">บทบาทกำหนดโดย Admin · หัวหน้าโดยตรงกำหนดจากโครงสร้างองค์กร</p>
          </Sheet>
        ) : null}

        {tab === "security" ? (
          <Sheet className="p-5">
            <h2 className="mb-3 text-16 font-semibold">เปลี่ยนรหัสผ่าน</h2>
            <div className="max-w-md">
              <ChangePasswordForm employeeId={profile.code} loginName={profile.email} />
            </div>
          </Sheet>
        ) : null}
      </div>
    </>
  );
}
