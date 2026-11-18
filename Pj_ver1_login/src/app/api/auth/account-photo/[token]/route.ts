import { NextResponse, type NextRequest } from "next/server";
import { readCurrentPhoto, verifyAccountPhotoToken } from "@/lib/auth/accountPhoto";

export const runtime = "nodejs";

// รูปโปรไฟล์ของตัวเลือกบัญชีบนหน้า login – ไม่ต้องล็อกอิน แต่ต้องมีกุญแจรูปของบัญชีนั้น
// cache สั้นๆ เพื่อให้เปลี่ยนรูปแล้วหน้า login เห็นรูปใหม่เร็ว
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const code = await verifyAccountPhotoToken(token);
  if (!code) return new NextResponse(null, { status: 404 });
  const photo = await readCurrentPhoto(code);
  if (!photo) return new NextResponse(null, { status: 404 });
  return new NextResponse(photo.body as BodyInit, {
    headers: {
      "Content-Type": photo.type,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
      // รูปตั้งต้นบางรูปเป็น SVG – ห้ามรันสคริปต์ถ้ามีคนเปิดลิงก์ตรงๆ
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
