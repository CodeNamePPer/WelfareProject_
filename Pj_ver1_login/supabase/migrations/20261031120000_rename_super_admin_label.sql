-- เปลี่ยนชื่อแสดงผลของบทบาท SUPER_ADMIN เป็น "Admin" (code ยังคงเป็น SUPER_ADMIN)
update public.app_role set name_th = 'Admin' where code = 'SUPER_ADMIN';
