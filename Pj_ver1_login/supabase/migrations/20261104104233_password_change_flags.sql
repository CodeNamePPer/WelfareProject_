-- =============================================================================
-- การเปลี่ยน / รีเซ็ตรหัสผ่าน
--   must_change_password  บังคับตั้งรหัสใหม่ตอนล็อกอินครั้งถัดไป
--                         (บัญชีใหม่ หรือหลัง admin รีเซ็ตให้ด้วยรหัสชั่วคราว)
--   password_changed_at   เวลาที่รหัสผ่านเปลี่ยนล่าสุด แอปฝังค่านี้ไว้ใน session (JWT)
--                         ถ้าไม่ตรงกับค่าในตาราง = session ออกก่อนเปลี่ยนรหัส จึงใช้ไม่ได้แล้ว
-- =============================================================================

alter table public.employee_credential
  add column must_change_password boolean not null default false,
  add column password_changed_at timestamptz not null default now();

comment on column public.employee_credential.must_change_password is
  'true = ต้องตั้งรหัสผ่านใหม่ก่อนใช้งานระบบ (บัญชีใหม่ / หลังรีเซ็ตด้วยรหัสชั่วคราว)';
comment on column public.employee_credential.password_changed_at is
  'เวลาเปลี่ยนรหัสผ่านล่าสุด ใช้ตัด session ที่ออกก่อนหน้านั้น';
