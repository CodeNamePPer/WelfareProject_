# ระบบ Login – สวัสดิการพนักงาน

Next.js 15 (App Router) + TypeScript + Tailwind CSS 3

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env.local      # แล้วแก้ AUTH_SECRET (openssl rand -base64 48)
npm run dev                     # สร้าง data/users.json ให้อัตโนมัติถ้ายังไม่มี
```

เปิด http://localhost:3000 — บัญชีทดสอบ: `hr@company.co.th` / `E00003` รหัสผ่าน `Welfare@2026`
(ดูบัญชีอื่นทั้งหมดใน `scripts/seed-users.mjs`)

## ข้อมูลเก็บเป็น JSON (โฟลเดอร์ `data/`)

| ไฟล์ | เนื้อหา |
|---|---|
| `data/users.json` | ผู้ใช้: id, employeeId, email, name, role, status (ACTIVE/RESIGNED), passwordHash (bcrypt), lastLoginAt |
| `data/audit-log.json` | ประวัติ: LOGIN_SUCCESS / LOGIN_FAILED / LOGIN_BLOCKED_* / LOGOUT พร้อมเวลา, ผู้ใช้, IP |

เพิ่มผู้ใช้ใหม่ (ระบบจะเข้ารหัสรหัสผ่านให้):
```bash
npm run add-user -- auto new@company.co.th "ใหม่ ทดสอบ" EMPLOYEE "MyPass#2026"
```
ROLE: EMPLOYEE, APPROVER, HR, ACCOUNTING, AUDITOR, IT_SUPPORT, SUPER_ADMIN

ไฟล์ใน `data/*.json` อยู่ใน .gitignore (มี password hash) และควรสำรองข้อมูลโฟลเดอร์นี้สม่ำเสมอ

## ฟีเจอร์ตาม Requirement

- Google reCAPTCHA v2 ที่หน้า Login (ตรวจฝั่ง server) — ตั้ง `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` และ `RECAPTCHA_SECRET_KEY`
- จำกัดเฉพาะเครือข่ายที่ทำงาน — `ENFORCE_OFFICE_NETWORK=true` และ `OFFICE_ALLOWED_IPS=ip,cidr,...`
  (ต้องอยู่หลัง reverse proxy ที่ตั้ง `x-forwarded-for` เอง)
- Role-based access: กำหนดเส้นทางที่จำกัดสิทธิ์ใน `src/lib/auth/roles.ts` (`ROUTE_ROLES`)
- Audit Log การเข้า/ออกระบบ (NFR09)
- ล็อกชั่วคราว 15 นาที เมื่อใส่รหัสผิด 5 ครั้ง
- พนักงานที่ลาออกแล้ว (RESIGNED) เข้าระบบไม่ได้
- Session เป็น JWT ใน httpOnly cookie อายุ 8 ชั่วโมง

## ข้อจำกัดของการเก็บเป็นไฟล์ JSON

- เหมาะกับ server เครื่องเดียว (การเขียนต่อคิวในโปรเซสเดียว) หากรันหลาย instance ควรย้ายไปฐานข้อมูล
- การล็อกชั่วคราวจากรหัสผิด (rate limit) เก็บใน memory จะรีเซ็ตเมื่อรีสตาร์ท
- เมื่อต่อฐานข้อมูลจริง แก้เฉพาะ `users.ts`, `audit.ts` (ส่วนอื่นไม่ต้องแก้)

## โครงสร้าง

```
src/middleware.ts              ตรวจเครือข่าย, session, สิทธิ์ตาม Role
src/app/login                  หน้า Login
src/app/api/auth/login|logout  API
src/lib/auth/                  session, roles, users, audit, json-store, recaptcha, network, rate-limit
scripts/                       seed-users, add-user
```
