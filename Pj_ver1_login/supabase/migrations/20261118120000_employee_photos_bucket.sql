-- =============================================================================
-- รูปโปรไฟล์ที่พนักงานอัปโหลดเอง (หน้าโปรไฟล์ทุกบทบาท)
--   ไฟล์อยู่ใน bucket employee-photos: {employee.id}/{uuid}.{ext}
--   employee.photo_url เก็บเป็น /api/photos/{path} ซึ่งเปิดได้เฉพาะผู้ที่ล็อกอินแล้ว
-- =============================================================================

-- bucket ส่วนตัว อ่าน/เขียนผ่าน service role เท่านั้น
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('employee-photos', 'employee-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
