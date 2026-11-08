"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { Icon } from "./Icon";

// ช่องกรอกข้อมูลตาม Style Guide ข้อ 4: สูง 44px, focus = ขอบ primary-500 + ring 3px, error = ขอบแดง + ข้อความใต้ช่อง

const CONTROL =
  "h-11 w-full rounded-lg border bg-white px-3 text-13 text-ink placeholder:text-muted/80 " +
  "focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/25 " +
  "disabled:bg-surface disabled:text-muted";

function controlClass(error?: string, extra = "") {
  return `${CONTROL} ${error ? "border-status-rejected" : "border-line"} ${extra}`;
}

interface FieldProps {
  label: string;
  error?: string; // ข้อความ error (แสดงสีแดงใต้ช่อง)
  hint?: string; // ข้อความช่วยเหลือ (สีเทา)
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

/**
 * กรอบของช่องกรอก: label + ช่อง + ข้อความใต้ช่อง
 * children เป็นฟังก์ชันที่รับ id มา เพื่อผูก <label htmlFor> กับช่องให้ screen reader อ่านถูก
 */
export function Field({ label, error, hint, className = "", children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-12 font-medium text-muted">
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} className="text-12 text-status-rejected">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-12 text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** ช่องข้อความ */
export function TextInput({ error, className = "", ...rest }: ComponentProps<"input"> & { error?: string }) {
  return <input aria-invalid={!!error || undefined} className={controlClass(error, className)} {...rest} />;
}

/** ช่องค้นหา มีไอคอนแว่นขยายด้านซ้าย */
export function SearchInput({ className = "", ...rest }: ComponentProps<"input">) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" />
      <input type="search" className={controlClass(undefined, "pl-10")} {...rest} />
    </div>
  );
}

export interface Option {
  value: string;
  label: string;
}

/** Dropdown (ใช้ <select> ของ browser จึงใช้คีย์บอร์ดได้ครบ) */
export function Select({ options, error, className = "", ...rest }: ComponentProps<"select"> & { options: Option[]; error?: string }) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <select aria-invalid={!!error || undefined} className={controlClass(error, "appearance-none pr-10")} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted" />
    </div>
  );
}

/** Checkbox ขนาด 18px */
export function Checkbox(props: ComponentProps<"input">) {
  return <input type="checkbox" className="size-[18px] cursor-pointer rounded accent-primary-600" {...props} />;
}
