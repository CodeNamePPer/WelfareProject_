-- =====================================================================
-- ขยาย view v_app_user ให้มีข้อมูลพนักงานครบสำหรับหน้าตั้งค่าผู้ใช้งาน
-- (ชื่อเต็ม ติดต่อ ที่อยู่ แผนก/ตำแหน่ง/ระดับ หัวหน้า วันเริ่มงาน/ลาออก)
-- เพิ่มคอลัมน์ต่อท้ายเท่านั้น คอลัมน์เดิมไม่เปลี่ยน (create or replace view ทำได้)
-- =====================================================================

create or replace view public.v_app_user
with (security_invoker = true) as
select
  e.id                                         as employee_uuid,
  e.employee_code                              as employee_id,
  c.login_name                                 as email,
  lower(c.login_name)                          as login_key,
  lower(e.employee_code)                       as code_key,
  btrim(e.first_name_th
        || case when e.last_name_th = '-' then '' else ' ' || e.last_name_th end) as name,
  coalesce((
    select r.code
    from public.user_role ur
    join public.app_role r on r.id = ur.role_id and r.is_active
    where ur.employee_id = e.id and ur.revoked_at is null
    order by case r.code when 'SUPER_ADMIN' then 1 when 'HR' then 2 when 'FINANCE' then 3 else 4 end
    limit 1
  ), 'EMPLOYEE')                               as role,
  upper(e.employment_status::text)             as status,
  c.last_login_at,
  greatest(e.updated_at, c.updated_at)         as updated_at,

  -- ชื่อ
  e.title_th,
  e.first_name_th,
  nullif(e.last_name_th, '-')                  as last_name_th,
  e.first_name_en,
  e.last_name_en,
  e.nickname,

  -- ติดต่อ
  e.email                                      as contact_email,
  e.phone,
  e.emergency_contact_name,
  e.emergency_contact_phone,

  -- ที่อยู่
  e.address_line,
  e.subdistrict,
  e.district,
  e.province,
  e.postal_code,

  -- งาน
  d.name_th                                    as department_name,
  p.name_th                                    as position_name,
  jl.name_th                                   as job_level_name,
  m.employee_code                              as manager_code,
  btrim(m.first_name_th
        || case when m.last_name_th = '-' then '' else ' ' || m.last_name_th end) as manager_name,

  -- สถานะการจ้าง
  e.hire_date,
  e.resigned_date,
  e.deceased_date,
  e.status_reason
from public.employee e
join public.employee_credential c on c.employee_id = e.id
left join public.department d on d.id = e.department_id
left join public.position p   on p.id = e.position_id
left join public.job_level jl on jl.id = e.job_level_id
left join public.employee m   on m.id = e.manager_employee_id and m.deleted_at is null
where e.deleted_at is null;

comment on view public.v_app_user is
  'มุมมองบัญชีผู้ใช้สำหรับแอป (อ่านอย่างเดียว) email = ชื่อล็อกอิน, contact_email = อีเมลติดต่อ, role = บทบาทสูงสุดที่ยังใช้งาน';
revoke all on public.v_app_user from public, anon, authenticated;
grant select on public.v_app_user to service_role;
