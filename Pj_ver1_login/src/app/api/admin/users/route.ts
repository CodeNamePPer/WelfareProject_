import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { getClientIp } from "@/lib/auth/network";
import { writeAudit, type AuditChanges } from "@/lib/auth/audit";
import { getUserById, updateUser } from "@/lib/auth/users";

export const runtime = "nodejs";

const EDITABLE_FIELDS = ["name", "email", "role", "status"] as const;

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { employeeId } = body;
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json({ error: "ไม่พบรหัสพนักงาน" }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: "กรุณาระบุเหตุผลการเปลี่ยนแปลง" }, { status: 400 });
    }

    const before = await getUserById(employeeId);
    if (!before) {
      return NextResponse.json({ error: "ไม่พบผู้ใช้งาน" }, { status: 404 });
    }

    // เก็บเฉพาะคอลัมน์ที่เปลี่ยนจริง (employeeId เป็น Primary Key — ไม่อนุญาตให้แก้ไข)
    const update: Record<string, string> = {};
    const changes: AuditChanges = {};
    for (const field of EDITABLE_FIELDS) {
      const value = body[field];
      if (typeof value === "string" && value !== before[field]) {
        update[field] = value;
        changes[field] = { old: before[field], new: value };
      }
    }

    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ ok: true, updatedAt: before.updatedAt });
    }

    const now = new Date().toISOString();
    await updateUser(employeeId, update);

    await writeAudit({
      action: "USER_UPDATE",
      userId: session.sub,
      ip: getClientIp(req.headers),
      targetId: employeeId,
      changes,
      reason,
    });

    return NextResponse.json({ ok: true, updatedAt: now });
  } catch (err) {
    console.error("Error updating user:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" }, { status: 500 });
  }
}
