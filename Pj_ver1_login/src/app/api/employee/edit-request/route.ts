import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/get-session";
import { EMPLOYEE_CHANGE_TOPICS, EditRequestError, submitEmployeeEditRequest, type EmployeeChangeTopic } from "@/lib/hr/editRequests";

export const runtime = "nodejs";

// พนักงานยื่นคำขอเปลี่ยนข้อมูลของตัวเอง (/employee/profile/changeprofile) ส่งเข้าคิว HR ที่แท็บคำขอแก้ไขข้อมูลใน /hr/employees
// multipart: field, value, value2 (เบอร์โทรผู้ติดต่อฉุกเฉิน), reason, evidence (ไฟล์ 1 ไฟล์)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value : "";
  };
  const field = text("field");
  if (field === "email") return NextResponse.json({ error: "อีเมลใช้เป็นชื่อเข้าระบบ ต้องให้ผู้ดูแลระบบ (Admin) เป็นผู้เปลี่ยน" }, { status: 400 });
  if (!EMPLOYEE_CHANGE_TOPICS.includes(field as EmployeeChangeTopic)) return NextResponse.json({ error: "เลือกข้อมูลที่ต้องการเปลี่ยน" }, { status: 400 });
  const evidence = form.get("evidence");
  if (!(evidence instanceof File) || evidence.size === 0) return NextResponse.json({ error: "แนบหลักฐานประกอบคำขอ" }, { status: 400 });

  try {
    await submitEmployeeEditRequest(session.sub, field as EmployeeChangeTopic, text("value"), text("reason"), evidence, text("value2"));
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof EditRequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[employee edit request] submit failed", err);
    return NextResponse.json({ error: "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" }, { status: 500 });
  }
}
