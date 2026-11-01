-- ลบ audit_log ระดับฐานข้อมูล (ซ้ำกับ audit_logs ที่แอปใช้)
-- cascade ลบ trigger <table>_write_audit_log บนทุกตารางไปพร้อมกัน
drop function if exists public.write_audit_log() cascade;
drop table if exists public.audit_log;
drop function if exists public.audit_log_guard();
