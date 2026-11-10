-- =====================================================================
-- เพิ่มข้อมูลส่วนตัวและครอบครัวในตาราง employee ให้ครบตามฟอร์มเพิ่มพนักงาน
-- ทุกคอลัมน์เว้นว่างได้ เพราะพนักงานเดิมยังไม่มีข้อมูลเหล่านี้
-- =====================================================================

alter table public.employee
  add column gender            text,
  add column nationality       text,
  add column citizen_id        text,
  add column birth_date        date,
  add column religion          text,
  add column marital_status    text,
  add column children_count    integer,
  add column father_first_name text,
  add column father_last_name  text,
  add column mother_first_name text,
  add column mother_last_name  text,
  add constraint employee_citizen_id_format check (citizen_id is null or citizen_id ~ '^[0-9]{13}$'),
  add constraint employee_children_count_check check (children_count is null or children_count >= 0),
  add constraint employee_birth_before_hire check (birth_date is null or birth_date < hire_date);

create unique index employee_citizen_id_active_uniq
  on public.employee (citizen_id)
  where deleted_at is null and citizen_id is not null;
