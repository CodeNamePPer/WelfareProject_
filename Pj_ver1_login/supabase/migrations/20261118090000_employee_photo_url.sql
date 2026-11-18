-- เพิ่มคอลัมน์ photo_url ให้พนักงานทุกคนมีรูปโปรไฟล์และเปิดเผยใน v_app_user
alter table public.employee
  add column if not exists photo_url text;

comment on column public.employee.photo_url is 'URL หรือ path รูปโปรไฟล์พนักงาน (เช่น /avatars/E00001.jpg)';

create or replace view public.v_app_user as
select e.id as employee_uuid,
    e.employee_code as employee_id,
    c.login_name as email,
    lower(c.login_name) as login_key,
    lower(e.employee_code) as code_key,
    btrim((e.first_name_th ||
        case
            when (e.last_name_th = '-'::text) then ''::text
            else (' '::text || e.last_name_th)
        end)) as name,
    coalesce(( select r.code
           from (user_role ur
             join app_role r on (((r.id = ur.role_id) and r.is_active)))
          where ((ur.employee_id = e.id) and (ur.revoked_at is null))
          order by
                case r.code
                    when 'SUPER_ADMIN'::text then 1
                    when 'HR'::text then 2
                    when 'FINANCE'::text then 3
                    else 4
                end
         limit 1), 'EMPLOYEE'::text) as role,
    upper((e.employment_status)::text) as status,
    c.last_login_at,
    greatest(e.updated_at, c.updated_at) as updated_at,
    e.title_th,
    e.first_name_th,
    nullif(e.last_name_th, '-'::text) as last_name_th,
    e.first_name_en,
    e.last_name_en,
    e.nickname,
    e.email as contact_email,
    e.phone,
    e.emergency_contact_name,
    e.emergency_contact_phone,
    e.address_line,
    e.subdistrict,
    e.district,
    e.province,
    e.postal_code,
    d.name_th as department_name,
    p.name_th as position_name,
    jl.name_th as job_level_name,
    m.employee_code as manager_code,
    btrim((m.first_name_th ||
        case
            when (m.last_name_th = '-'::text) then ''::text
            else (' '::text || m.last_name_th)
        end)) as manager_name,
    e.hire_date,
    e.resigned_date,
    e.deceased_date,
    e.status_reason,
    e.photo_url
   from (((((employee e
     join employee_credential c on ((c.employee_id = e.id)))
     left join department d on ((d.id = e.department_id)))
     left join "position" p on ((p.id = e.position_id)))
     left join job_level jl on ((jl.id = e.job_level_id)))
     left join employee m on (((m.id = e.manager_employee_id) and (m.deleted_at is null))))
  where (e.deleted_at is null);

update public.employee
set photo_url = case
  when employee_code in ('E00010','E00011','E00013','E00014','E00015','E00017','E00018','E00019','E00020')
    then '/avatars/' || employee_code || '.svg'
  else '/avatars/' || employee_code || '.jpg'
end
where deleted_at is null
  and photo_url is null;
