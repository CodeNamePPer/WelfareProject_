-- =============================================================================
-- audit_logs: log ระดับแอป (ล็อกอิน/ออก, แก้ไขผู้ใช้ในหน้า "ตั้งค่าผู้ใช้งานระบบ")
--   - เขียนจากฝั่งเซิร์ฟเวอร์ (service_role) ผ่าน src/lib/auth/audit.ts
--   - แยกจาก audit_log (ตัวเดียว) ที่เขียนได้จาก trigger เท่านั้น
--   - เพิ่มได้อย่างเดียว ห้ามแก้/ลบ
-- =============================================================================

create table public.audit_logs (
  id          bigint generated always as identity primary key,
  action      text not null,
  user_id     text,
  identifier  text,
  ip_address  text,
  details     text,
  target_id   text,
  changes     jsonb,
  reason      text,
  created_at  timestamptz not null default now()
);
comment on table  public.audit_logs is 'log ระดับแอป (ใครทำอะไร เมื่อไร จากที่ไหน) เพิ่มได้อย่างเดียว ห้ามแก้/ลบ';
comment on column public.audit_logs.user_id is 'employee_id ของผู้ดำเนินการ (null = ไม่ทราบ/ระบบ)';
comment on column public.audit_logs.target_id is 'employee_id ของผู้ใช้ที่ถูกแก้';
comment on column public.audit_logs.changes is 'เฉพาะคอลัมน์ที่เปลี่ยน รูปแบบ {"คอลัมน์": {"old": ค่าเดิม, "new": ค่าใหม่}}';
comment on column public.audit_logs.reason is 'เหตุผลการเปลี่ยนแปลงที่ผู้แก้ระบุ';

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_target_idx on public.audit_logs (target_id, created_at desc);

-- อ่าน/เขียนผ่าน service_role เท่านั้น (ไม่มี policy สำหรับ anon/authenticated)
alter table public.audit_logs enable row level security;
revoke all on public.audit_logs from public, anon, authenticated;
revoke update, delete, truncate on public.audit_logs from service_role;
