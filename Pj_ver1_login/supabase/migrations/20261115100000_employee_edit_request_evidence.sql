-- =============================================================================
-- หลักฐานประกอบคำขอแก้ไขข้อมูลพนักงาน (ฟอร์ม /employee/profile/changeprofile)
--   employee_edit_request.evidence_*   ไฟล์หลักฐาน 1 ไฟล์ต่อคำขอ (ตัวไฟล์อยู่ใน bucket employee-edit-docs)
-- =============================================================================

alter table public.employee_edit_request
  add column evidence_path text,
  add column evidence_name text,
  add column evidence_mime text;

comment on column public.employee_edit_request.evidence_path is 'path ของไฟล์หลักฐานใน bucket employee-edit-docs (null = ไม่มีหลักฐาน เช่น คำขอจากหน้าโปรไฟล์ HR)';
comment on column public.employee_edit_request.evidence_name is 'ชื่อไฟล์เดิมที่ผู้ขอแนบ';
comment on column public.employee_edit_request.evidence_mime is 'ชนิดไฟล์หลักฐาน';

-- bucket ส่วนตัว อ่าน/เขียนผ่าน service role เท่านั้น HR เปิดดูด้วย signed URL
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-edit-docs', 'employee-edit-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
