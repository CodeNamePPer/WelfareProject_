-- =============================================================================
-- "ออกจากระบบทุกอุปกรณ์" (หน้าโปรไฟล์ P01/P02)
--   session ใช้ได้เมื่อ pwd ใน token ตรงกับ max(password_changed_at, sessions_revoked_at)
--   กดออกจากระบบทุกอุปกรณ์ = เลื่อน sessions_revoked_at เป็นตอนนี้ แล้วออก token ใหม่ให้เครื่องที่กด
--   (รหัสผ่านไม่เปลี่ยน password_changed_at จึงยังเป็นวันที่เปลี่ยนรหัสจริง)
-- =============================================================================

alter table public.employee_credential
  add column sessions_revoked_at timestamptz;

comment on column public.employee_credential.sessions_revoked_at is 'กดออกจากระบบทุกอุปกรณ์ล่าสุด session ที่ออกก่อนเวลานี้ใช้ไม่ได้ (null = ไม่เคยกด)';
