-- รวมตาราง public.users (เดิม) เข้ากับ public.employee
--   * employee = ตารางหลักข้อมูลพนักงาน (ชื่อ สถานะ ประวัติงาน soft delete audit)
--   * user_role/app_role = บทบาท (แทน users.role)
--   * employee_credential = รหัสผ่าน/ชื่อล็อกอิน/เวลาล็อกอินล่าสุด (แยกจากข้อมูลส่วนตัว)
-- ขั้นตอนนี้ "ไม่ลบ/ไม่แก้" ตาราง users ให้ย้ายข้อมูลเข้ามาก่อน แล้วค่อยเปลี่ยนชื่อ users เป็นสำรองในขั้นถัดไป

-- ---------------------------------------------------------------------
-- 1) ตรวจข้อมูลต้นทางก่อนย้าย (ถ้า map ไม่ได้ ให้ยกเลิกทั้ง migration)
-- ---------------------------------------------------------------------
do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from public.users u
  where upper(btrim(u.role, E' \t\r\n')) not in (select code from public.app_role where is_active)
     or upper(btrim(u.status, E' \t\r\n')) not in ('ACTIVE', 'RESIGNED')
     or btrim(coalesce(u.name, ''), E' \t\r\n') = ''
     or btrim(coalesce(u.employee_id, '')) = '';
  if v_bad > 0 then
    raise exception 'users มี % แถวที่บทบาท/สถานะ/ชื่อ/รหัส map เข้า employee ไม่ได้', v_bad;
  end if;

  if exists (
    select 1 from public.users u
    join public.employee e on e.employee_code = btrim(u.employee_id)
  ) then
    raise exception 'employee_code ซ้ำกับ users.employee_id';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) ตารางข้อมูลเข้าสู่ระบบ (หนึ่งพนักงาน หนึ่งบัญชี)
-- ---------------------------------------------------------------------
create table public.employee_credential (
  employee_id   uuid primary key references public.employee (id),
  login_name    text not null check (btrim(login_name) <> ''),
  password_hash text not null,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid
);
comment on table  public.employee_credential is 'ข้อมูลเข้าสู่ระบบของพนักงาน (แยกจาก employee) เข้าถึงได้เฉพาะ service role ห้ามลบจริง';
comment on column public.employee_credential.login_name    is 'ชื่อที่ใช้ล็อกอิน (อีเมล หรือ username เช่น admin) ไม่ซ้ำแบบไม่สนตัวพิมพ์';
comment on column public.employee_credential.password_hash is 'bcrypt hash ห้ามส่งออกหรือใส่ใน audit_log';
comment on column public.employee_credential.last_login_at is 'เวลาล็อกอินสำเร็จล่าสุด';

create unique index employee_credential_login_name_uniq
  on public.employee_credential (lower(login_name));

alter table public.employee_credential enable row level security;
revoke all on public.employee_credential from public, anon, authenticated;

create trigger employee_credential_set_audit_columns
  before insert or update on public.employee_credential
  for each row execute function public.set_audit_columns();
create trigger employee_credential_prevent_hard_delete
  before delete on public.employee_credential
  for each row execute function public.prevent_hard_delete();
-- ตั้งใจไม่ผูก write_audit_log เพราะจะเก็บ password_hash ลง audit_log

-- ---------------------------------------------------------------------
-- 3) ย้ายข้อมูล users -> employee + employee_credential + user_role
-- ---------------------------------------------------------------------
with src as (
  select
    btrim(u.employee_id)                                             as code,
    btrim(u.name, E' \t\r\n')                                         as full_name,
    btrim(u.email)                                                    as login_name,
    upper(btrim(u.status, E' \t\r\n'))                                as st,
    (coalesce(u.created_at, now()) at time zone 'Asia/Bangkok')::date as hire,
    (coalesce(u.updated_at, now()) at time zone 'Asia/Bangkok')::date as upd
  from public.users u
), split as (
  select *, split_part(full_name, ' ', 1) as fn from src
)
insert into public.employee
  (employee_code, first_name_th, last_name_th, email, employment_status, hire_date, resigned_date, status_reason)
select
  code,
  fn,
  coalesce(nullif(btrim(substr(full_name, length(fn) + 1), E' \t\r\n'), ''), '-'),
  case when login_name ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
       then login_name
       else lower(code) || '@no-email.invalid' end,
  case st when 'RESIGNED' then 'resigned'::public.employment_status
          else 'active'::public.employment_status end,
  hire,
  case when st = 'RESIGNED' then greatest(hire, upd) end,
  case when st = 'RESIGNED' then 'ย้ายจากตาราง users เดิม (ไม่ทราบเหตุผลเดิม)' end
from split;

insert into public.employee_credential (employee_id, login_name, password_hash, last_login_at)
select e.id, btrim(u.email), u.password_hash, u.last_login_at
from public.users u
join public.employee e on e.employee_code = btrim(u.employee_id);

insert into public.user_role (employee_id, role_id)
select e.id, r.id
from public.users u
join public.employee e on e.employee_code = btrim(u.employee_id)
join public.app_role r on r.code = 'EMPLOYEE'
union
select e.id, r.id
from public.users u
join public.employee e on e.employee_code = btrim(u.employee_id)
join public.app_role r on r.code = upper(btrim(u.role, E' \t\r\n'))
where r.code <> 'EMPLOYEE';

-- ---------------------------------------------------------------------
-- 4) View สำหรับแอป (หน้าตาเหมือน users เดิม แต่ไม่มี password_hash)
-- ---------------------------------------------------------------------
create view public.v_app_user
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
  greatest(e.updated_at, c.updated_at)         as updated_at
from public.employee e
join public.employee_credential c on c.employee_id = e.id
where e.deleted_at is null;

comment on view public.v_app_user is
  'มุมมองบัญชีผู้ใช้สำหรับแอป (อ่านอย่างเดียว) email = ชื่อล็อกอิน, role = บทบาทสูงสุดที่ยังใช้งาน';
revoke all on public.v_app_user from public, anon, authenticated;
grant select on public.v_app_user to service_role;

-- ---------------------------------------------------------------------
-- 5) ฟังก์ชันแก้ไข/สร้างบัญชี (ทำในหนึ่ง transaction) เรียกได้เฉพาะ service role
-- ---------------------------------------------------------------------
create or replace function public.admin_update_user_account(
  p_employee_code text,
  p_name          text default null,
  p_login_name    text default null,
  p_role          text default null,
  p_status        text default null,   -- 'ACTIVE' | 'RESIGNED'
  p_reason        text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_emp        public.employee%rowtype;
  v_name       text;
  v_first      text;
  v_last       text;
  v_login      text;
  v_role_id    uuid;
  v_new_status public.employment_status;
begin
  select * into v_emp
  from public.employee
  where employee_code = p_employee_code and deleted_at is null
  for update;
  if not found then
    raise exception 'ไม่พบผู้ใช้งาน' using errcode = 'P0002';
  end if;

  if p_name is not null then
    v_name  := btrim(p_name, E' \t\r\n');
    v_first := split_part(v_name, ' ', 1);
    if v_first = '' then
      raise exception 'ชื่อห้ามว่าง' using errcode = 'P0001';
    end if;
    v_last := coalesce(nullif(btrim(substr(v_name, length(v_first) + 1), E' \t\r\n'), ''), '-');
    update public.employee set first_name_th = v_first, last_name_th = v_last where id = v_emp.id;
  end if;

  if p_login_name is not null then
    v_login := btrim(p_login_name);
    if v_login = '' then
      raise exception 'ชื่อล็อกอิน/อีเมลห้ามว่าง' using errcode = 'P0001';
    end if;
    update public.employee_credential set login_name = v_login where employee_id = v_emp.id;
    if v_login ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      update public.employee set email = v_login where id = v_emp.id;
    end if;
  end if;

  if p_status is not null then
    if v_emp.employment_status = 'deceased' then
      raise exception 'พนักงานที่เสียชีวิตเปลี่ยนสถานะจากหน้านี้ไม่ได้' using errcode = 'P0001';
    end if;
    v_new_status := (case upper(p_status)
                       when 'ACTIVE'   then 'active'
                       when 'RESIGNED' then 'resigned'
                     end)::public.employment_status;
    if v_new_status is null then
      raise exception 'สถานะไม่ถูกต้อง: %', p_status using errcode = 'P0001';
    end if;
    if v_new_status <> v_emp.employment_status then
      update public.employee
         set employment_status = v_new_status,
             resigned_date = case when v_new_status = 'resigned'
                                  then greatest(hire_date, (now() at time zone 'Asia/Bangkok')::date) end,
             status_reason = p_reason
       where id = v_emp.id;
    end if;
  end if;

  if p_role is not null then
    select id into v_role_id from public.app_role where code = upper(p_role) and is_active;
    if v_role_id is null then
      raise exception 'บทบาทไม่ถูกต้อง: %', p_role using errcode = 'P0001';
    end if;

    update public.user_role as ur
       set revoked_at = now()
      from public.app_role r
     where ur.role_id = r.id
       and ur.employee_id = v_emp.id
       and ur.revoked_at is null
       and r.code in ('HR', 'FINANCE', 'SUPER_ADMIN')
       and r.id <> v_role_id;

    insert into public.user_role (employee_id, role_id)
    select v_emp.id, r.id
    from public.app_role r
    where r.is_active
      and (r.id = v_role_id or r.code = 'EMPLOYEE')
      and not exists (
        select 1 from public.user_role x
        where x.employee_id = v_emp.id and x.role_id = r.id and x.revoked_at is null
      );
  end if;

  update public.employee set updated_at = now() where id = v_emp.id;
end;
$fn$;

create or replace function public.admin_create_user_account(
  p_employee_code text,
  p_login_name    text,
  p_name          text,
  p_role          text,
  p_password_hash text,
  p_email         text default null,
  p_hire_date     date default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id      uuid;
  v_name    text := btrim(p_name, E' \t\r\n');
  v_first   text;
  v_last    text;
  v_login   text := btrim(p_login_name);
  v_code    text := btrim(p_employee_code);
  v_email   text;
  v_role_id uuid;
begin
  select id into v_role_id from public.app_role where code = upper(p_role) and is_active;
  if v_role_id is null then
    raise exception 'บทบาทไม่ถูกต้อง: %', p_role using errcode = 'P0001';
  end if;

  v_first := split_part(v_name, ' ', 1);
  if v_first = '' or v_code = '' or v_login = '' then
    raise exception 'รหัสพนักงาน ชื่อ และชื่อล็อกอิน ห้ามว่าง' using errcode = 'P0001';
  end if;
  v_last := coalesce(nullif(btrim(substr(v_name, length(v_first) + 1), E' \t\r\n'), ''), '-');

  v_email := coalesce(
    nullif(btrim(p_email), ''),
    case when v_login ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_login
         else lower(v_code) || '@no-email.invalid' end);

  insert into public.employee (employee_code, first_name_th, last_name_th, email, hire_date)
  values (v_code, v_first, v_last, v_email,
          coalesce(p_hire_date, (now() at time zone 'Asia/Bangkok')::date))
  returning id into v_id;

  insert into public.employee_credential (employee_id, login_name, password_hash)
  values (v_id, v_login, p_password_hash);

  insert into public.user_role (employee_id, role_id)
  select v_id, r.id from public.app_role r
  where r.is_active and (r.code = 'EMPLOYEE' or r.id = v_role_id);

  return v_id;
end;
$fn$;

revoke all on function public.admin_update_user_account(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.admin_create_user_account(text, text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.admin_update_user_account(text, text, text, text, text, text) to service_role;
grant execute on function public.admin_create_user_account(text, text, text, text, text, text, date) to service_role;

-- ---------------------------------------------------------------------
-- 6) ตรวจหลังย้าย: จำนวนต้องตรงกัน และทุกคนมีบทบาทที่ใช้งานอยู่
-- ---------------------------------------------------------------------
do $$
declare
  v_users int;
  v_cred  int;
  v_norole int;
begin
  select count(*) into v_users from public.users;
  select count(*) into v_cred from public.employee_credential;
  if v_users <> v_cred then
    raise exception 'จำนวนไม่ตรง: users=% employee_credential=%', v_users, v_cred;
  end if;

  select count(*) into v_norole
  from public.employee_credential c
  where not exists (
    select 1 from public.user_role ur
    where ur.employee_id = c.employee_id and ur.revoked_at is null
  );
  if v_norole > 0 then
    raise exception 'มี % บัญชีที่ไม่มีบทบาทที่ใช้งานอยู่', v_norole;
  end if;
end $$;
