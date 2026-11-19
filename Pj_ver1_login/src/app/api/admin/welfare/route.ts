import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/get-session";

export const runtime = "nodejs";

/** ปิดการแก้ไขสวัสดิการโดยตรง — ต้องเสนอผ่านขั้นตอนอนุมัติของหัวหน้า HR */
export async function PUT() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
  }
  return NextResponse.json(
    { error: "การเพิ่มหรือแก้ไขสวัสดิการต้องส่งเป็นข้อเสนอให้หัวหน้า HR อนุมัติที่หน้า /admin/benefits/propose" },
    { status: 403 },
  );
}
