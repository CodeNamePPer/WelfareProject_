import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { updateUser } from "@/lib/auth/users";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, email, name, role, status, employeeId } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ไม่พบรหัสผู้ใช้" }, { status: 400 });
    }

    const now = new Date().toISOString();
    await updateUser(id, {
      ...(email !== undefined ? { email } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(employeeId !== undefined ? { employeeId } : {}),
    });

    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}
