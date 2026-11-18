import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { readPhoto } from "@/lib/employee/photo";

export const runtime = "nodejs";

// ส่งรูปโปรไฟล์ที่อัปโหลดไว้ ให้เฉพาะผู้ที่ล็อกอินแล้ว (ใช้เป็น src ของ <img> ทั่วระบบ)
// path มี uuid ใหม่ทุกครั้งที่เปลี่ยนรูป จึง cache ได้นาน
export async function GET(_req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const session = await getSession();
  if (!session) return new NextResponse(null, { status: 401 });
  const { path } = await params;
  const photo = await readPhoto(path.join("/"));
  if (!photo) return new NextResponse(null, { status: 404 });
  return new NextResponse(photo, {
    headers: {
      "Content-Type": photo.type || "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
