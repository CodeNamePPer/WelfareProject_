-- =============================================================================
-- 20261118090000_employee_photo_url ตั้ง photo_url ตั้งต้นเป็น /avatars/<code>.jpg ให้ทุกคน
-- แต่ public/avatars มีไฟล์แค่ E00001–E00020 พนักงานรหัสถัดไปจึงได้ลิงก์รูปที่ไม่มีอยู่ (รูปแตก)
-- ล้างค่าเหล่านั้นเป็น null ให้หน้าจอแสดงอักษรย่อแทน รูปที่อัปโหลดเอง (/api/photos/...) ไม่ถูกแตะ
-- =============================================================================

update public.employee
set photo_url = null
where deleted_at is null
  and photo_url ~ '^/avatars/E[0-9]{5}\.(jpg|svg|png)$'
  and employee_code ~ '^E[0-9]{5}$'
  and substring(employee_code from 2)::int > 20;
