import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { PhotoError, uploadOwnPhoto } from "@/lib/employee/photo";

export const runtime = "nodejs";

// ผู้ใช้ทุกบทบาทเปลี่ยนรูปโปรไฟล์ของตัวเอง (หน้าโปรไฟล์) multipart: photo (ไฟล์ 1 ไฟล์)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return NextResponse.json({ error: "เลือกรูปที่ต้องการใช้" }, { status: 400 });

  try {
    const photoUrl = await uploadOwnPhoto(session.sub, photo);
    return NextResponse.json({ photoUrl }, { status: 201 });
  } catch (err) {
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[employee photo] upload failed", err);
    return NextResponse.json({ error: "เปลี่ยนรูปไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
