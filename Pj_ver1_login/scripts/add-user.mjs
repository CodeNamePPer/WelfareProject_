// เพิ่มผู้ใช้ใหม่ลงใน Supabase (สร้าง employee + บัญชีล็อกอิน + บทบาท ในหนึ่ง transaction)
// รัน: npm run add-user -- <employeeId> <loginName> "<ชื่อ>" <ROLE> <password>
// employeeId: รูปแบบ E + เลข 5 หลัก (เช่น E00019) หรือ auto = ใช้รหัสถัดไปอัตโนมัติ
// ตัวอย่าง: npm run add-user -- auto new@company.co.th "ใหม่ ทดสอบ" EMPLOYEE "MyPass#2026"
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
// ต้องใช้ service role key เท่านั้น (ฟังก์ชันสร้างบัญชีเรียกได้เฉพาะ service role)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ขาด NEXT_PUBLIC_SUPABASE_URL หรือ SUPABASE_SERVICE_ROLE_KEY ใน .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ROLES = ["EMPLOYEE", "HR", "FINANCE", "SUPER_ADMIN"];
const [employeeId, loginName, name, role, password] = process.argv.slice(2);

if (!employeeId || !loginName || !name || !role || !password) {
  console.error('ใช้งาน: npm run add-user -- <employeeId> <loginName> "<ชื่อ>" <ROLE> <password>');
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`ROLE ไม่ถูกต้อง เลือกจาก: ${ROLES.join(", ")}`);
  process.exit(1);
}
const autoCode = employeeId.toLowerCase() === "auto";
if (!autoCode && !/^Ed{5}$/.test(employeeId)) {
  console.error("รหัสพนักงานต้องเป็นรูปแบบ E + เลข 5 หลัก (เช่น E00019) หรือใช้ auto");
  process.exit(1);
}
if (password.length < 8) {
  console.error("รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร");
  process.exit(1);
}

async function run() {
  const passwordHash = await bcrypt.hash(password, 10);

  const { data: code, error } = await supabase.rpc("admin_create_user_account", {
    p_employee_code: autoCode ? null : employeeId,
    p_login_name: loginName,
    p_name: name,
    p_role: role,
    p_password_hash: passwordHash,
  });

  if (error) {
    console.error("❌ เพิ่มผู้ใช้ไม่สำเร็จ:", error.message);
    process.exit(1);
  }

  console.log(`✅ เพิ่ม ${loginName} (${role}) รหัสพนักงาน ${code} ลงใน Supabase สำเร็จแล้ว!`);
}

run();
