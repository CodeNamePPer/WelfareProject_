import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon, type IconKey } from "./Icon";

// ปุ่มตาม Style Guide ข้อ 4: สูง 40px, มุมโค้ง 8px, 4 แบบ
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-700",
  secondary: "border border-primary-600 bg-white text-primary-600 hover:bg-primary-50",
  ghost: "text-ink hover:bg-primary-50",
  danger: "bg-status-rejected text-white hover:bg-[#b91c1c]",
};

const SIZE: Record<Size, string> = {
  md: "h-10 px-4 text-12 gap-2",
  sm: "h-8 px-3 text-12 gap-1.5",
};

/** รวม class ของปุ่ม — ใช้ร่วมกันระหว่าง <Button> และ <ButtonLink> */
export function buttonClass(variant: ButtonVariant = "primary", size: Size = "md", extra = "") {
  return [
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT[variant],
    SIZE[size],
    extra,
  ].join(" ");
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: Size;
  icon?: IconKey; // ไอคอนด้านซ้ายของข้อความ (ไม่บังคับ)
  children: ReactNode;
}

/** ปุ่มกด เช่น <Button variant="danger" onClick={...}>ปฏิเสธ</Button> */
export function Button({ variant, size, icon, children, className = "", type = "button", ...rest }: CommonProps & ComponentProps<"button">) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} className="size-4" />}
      {children}
    </button>
  );
}

/** ลิงก์ที่หน้าตาเป็นปุ่ม (ใช้เปลี่ยนหน้า) */
export function ButtonLink({ variant, size, icon, children, className = "", ...rest }: CommonProps & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon && <Icon name={icon} className="size-4" />}
      {children}
    </Link>
  );
}
