-- =====================================================================
-- รหัสพนักงานทุกคนใช้รูปแบบ E + เลข 5 หลัก (E00001)
--   E0001..E0008      -> E00001..E00008
--   DEMO-001..DEMO-010 -> E00009..E00018
-- อัปเดตรหัสที่อ้างถึงใน audit_logs ให้ตรงกัน แล้วบังคับรูปแบบด้วย check constraint
-- พนักงานใหม่ได้รหัสถัดไปอัตโนมัติจาก sequence (ระบุเองได้ถ้ารูปแบบถูก)
-- หมายเหตุ: session ที่ล็อกอินอยู่ด้วยรหัสเดิมต้องล็อกอินใหม่
-- =====================================================================

create temporary table employee_code_map as
select employee_code as old_code,
       case
         when employee_code ~ '^E[0-9]{4}$'
           then 'E' || lpad(substr(employee_code, 2), 5, '0')
         when employee_code ~ '^DEMO-[0-9]{3}$'
           then 'E' || lpad((substr(employee_code, 6)::int + 8)::text, 5, '0')
       end as new_code
from public.employee
where employee_code !~ '^E[0-9]{5}$';

do $$
begin
  if exists (select 1 from employee_code_map where new_code is null) then
    raise exception 'มีรหัสพนักงานที่แปลงอัตโนมัติไม่ได้: %',
      (select string_agg(old_code, ', ') from employee_code_map where new_code is null);
  end if;
  if exists (
    select 1 from employee_code_map m join public.employee e on e.employee_code = m.new_code
  ) then
    raise exception 'รหัสใหม่ชนกับรหัสที่มีอยู่แล้ว';
  end if;
end $$;

update public.employee e
set employee_code = m.new_code
from employee_code_map m
where e.employee_code = m.old_code;

update public.audit_logs a set user_id = m.new_code
from employee_code_map m where a.user_id = m.old_code;

update public.audit_logs a set target_id = m.new_code
from employee_code_map m where a.target_id = m.old_code;

drop table employee_code_map;

alter table public.employee
  add constraint employee_code_format check (employee_code ~ '^E[0-9]{5}$');

create sequence if not exists public.employee_code_seq as integer minvalue 1 maxvalue 99999;
select setval('public.employee_code_seq',
              greatest(1, coalesce((select max(substr(employee_code, 2)::int) from public.employee), 0)),
              exists (select 1 from public.employee));

alter table public.employee
  alter column employee_code set default 'E' || lpad(nextval('public.employee_code_seq')::text, 5, '0');
alter sequence public.employee_code_seq owned by public.employee.employee_code;
-- HR เพิ่มพนักงานผ่าน RLS ได้ ต้องใช้ sequence ของค่า default ได้ด้วย
grant usage on sequence public.employee_code_seq to authenticated, service_role;

comment on column public.employee.employee_code is
  'รหัสพนักงาน รูปแบบ E + เลข 5 หลัก (E00001) ไม่นำกลับมาใช้ซ้ำ ไม่ระบุจะได้เลขถัดไปอัตโนมัติ';
