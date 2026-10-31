-- ตาราง users ถูกรวมเข้า employee + employee_credential + user_role แล้ว
-- เก็บไว้เป็นสำรองเพื่อกู้คืน ห้ามให้แอปอ่าน/เขียน ลบทิ้งได้เมื่อยืนยันว่าระบบใหม่เสถียรแล้ว
alter table public.users rename to users_legacy_20261031;
comment on table public.users_legacy_20261031 is 'สำรองของตาราง users เดิม (ถูกรวมเข้า employee เมื่อ 2569-10-31) ห้ามใช้งาน ลบได้เมื่อยืนยันว่าระบบใหม่เสถียร';
