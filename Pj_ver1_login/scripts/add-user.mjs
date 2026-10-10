// เพิ่มผู้ใช้ใหม่ลงใน Supabase
// รัน: npm run add-user -- <employeeId> <email> "<ชื่อ>" <ROLE> <password>
// ตัวอย่าง: npm run add-user -- E0100 new@company.co.th "ใหม่ ทดสอบ" EMPLOYEE "MyPass#2026"
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [key, ...vals] = trimmed.split("=");
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ขาด Supabase URL หรือ Key ใน .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const ROLES = ["EMPLOYEE", "HR", "FINANCE", "SUPER_ADMIN"];
const [employeeId, email, name, role, password] = process.argv.slice(2);

if (!employeeId || !email || !name || !role || !password) {
  console.error('ใช้งาน: npm run add-user -- <employeeId> <email> "<ชื่อ>" <ROLE> <password>');
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`ROLE ไม่ถูกต้อง เลือกจาก: ${ROLES.join(", ")}`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร");
  process.exit(1);
}

async function run() {
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert([
      {
        employee_id: employeeId,
        email,
        name,
        role,
        status: "ACTIVE",
        password_hash: passwordHash,
      },
    ])
    .select();

  if (error) {
    console.error("❌ เพิ่มผู้ใช้ไม่สำเร็จ:", error.message);
    process.exit(1);
  }

  console.log(`✅ เพิ่ม ${email} (${role}) ลงใน Supabase สำเร็จแล้ว!`);
}

run();
