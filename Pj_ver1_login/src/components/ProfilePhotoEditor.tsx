'use client';

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { useNavTransition } from "@/lib/useNavTransition";
import { cx } from "@/lib/cx";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * รูปโปรไฟล์วงกลมบนหัวหน้าโปรไฟล์ พร้อมปุ่มกล้องให้เจ้าของเปลี่ยนรูปเอง (เปลี่ยนทันที ไม่ต้องรอ HR)
 * circleClassName = ขนาด สี ขอบ ของวงกลม (ใส่ระยะ -mt ที่ className ของตัวนอก)
 */
export function ProfilePhotoEditor({
  photoUrl,
  initials,
  className,
  circleClassName,
}: {
  photoUrl: string | null | undefined;
  initials: string;
  className?: string;
  circleClassName: string;
}) {
  const nav = useNavTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const busy = uploading || nav.isPending;
  const shown = preview ?? photoUrl ?? null;

  async function upload(file: File | undefined) {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError("");
    if (!ACCEPTED.includes(file.type)) {
      setError("รูปต้องเป็น JPG, PNG หรือ WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("รูปมีขนาดเกิน 5 MB");
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.set("photo", file);
      const response = await fetch("/api/employee/photo", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(result.error ?? "เปลี่ยนรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        return;
      }
      setPreview(result.photoUrl);
      // โหลดข้อมูลใหม่ให้รูปที่แถบเมนูและส่วนอื่นเปลี่ยนตาม
      nav.refresh();
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ รูปยังไม่ถูกเปลี่ยน กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cx("relative shrink-0", className)}>
      <div aria-hidden="true" className={cx("flex items-center justify-center overflow-hidden rounded-full", circleClassName, busy && "opacity-60")}>
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- รูปโปรไฟล์พนักงานในระบบ
          <img src={shown} alt="" className="size-full object-cover" />
        ) : (
          initials || "?"
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={busy ? "กำลังเปลี่ยนรูปโปรไฟล์" : "เปลี่ยนรูปโปรไฟล์"}
        title="เปลี่ยนรูปโปรไฟล์ (JPG, PNG, WebP ไม่เกิน 5 MB)"
        className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary-600 text-white shadow-sm transition hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-70"
      >
        <Camera className="size-4" aria-hidden="true" />
      </button>
      {error ? (
        <p role="alert" className="absolute left-0 top-full z-10 mt-1.5 w-max max-w-[260px] rounded-md border border-line bg-white px-2.5 py-1.5 text-12 text-status-rejected shadow-sm">
          {error}
        </p>
      ) : null}
    </div>
  );
}
