import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { supabaseAdmin } from "@/lib/supabase";
import { BENEFIT_IMAGE_BUCKET, signedImageUrl } from "@/lib/hr/proposals";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

// อัปโหลดรูปประกอบสวัสดิการ (ขั้น 1 ของฟอร์มเสนอ) คืน path ที่เก็บ และลิงก์ชั่วคราวไว้แสดงพรีวิว
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "HR" && session.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "เลือกไฟล์รูป" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "รองรับเฉพาะ JPG, PNG หรือ WebP" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 5 MB" }, { status: 400 });

  const path = `proposals/${randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage.from(BENEFIT_IMAGE_BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) {
    console.error("[hr proposals] image upload failed", error);
    return NextResponse.json({ error: "อัปโหลดรูปไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ path, url: await signedImageUrl(path) }, { status: 201 });
}
