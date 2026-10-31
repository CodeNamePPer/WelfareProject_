-- =============================================================================
-- ขั้น 2: ตารางหลักของระบบข้อมูลพนักงาน
--   department, job_level, position, employee, work_history,
--   app_role, permission, role_permission, user_role, system_setting
--
-- ขอบเขต: เฉพาะการจัดการ/แก้ไขข้อมูลพนักงาน (ไม่มีสวัสดิการ คำขอเบิก การอนุมัติ การจ่ายเงิน)
-- ตัวตนผู้ใช้: Supabase Auth -> employee.auth_user_id = auth.uid()
-- RLS: เปิดทุกตาราง แต่ policy จะเพิ่มในขั้น 4 (ระหว่างนี้ anon/authenticated เข้าไม่ได้เลย)
-- audit_log: ขั้น 3
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล (enum)
-- -----------------------------------------------------------------------------

-- สถานะการทำงานของพนักงาน
create type public.employment_status as enum ('active', 'resigned', 'deceased');
comment on type public.employment_status is 'สถานะพนักงาน: active=ทำงานอยู่, resigned=ลาออก, deceased=เสียชีวิต';

-- ประเภทการเปลี่ยนแปลงในประวัติการทำงาน
create type public.work_change_type as enum ('hire', 'transfer', 'position_change', 'manager_change', 'status_change');
comment on type public.work_change_type is 'ประเภทเหตุการณ์: hire=เริ่มงาน, transfer=ย้ายแผนก, position_change=เปลี่ยนตำแหน่ง/ระดับ, manager_change=เปลี่ยนหัวหน้า, status_change=เปลี่ยนสถานะ';


-- -----------------------------------------------------------------------------
-- ค่าตั้งค่าระบบ (ค่าที่เอกสาร requirement ไม่ได้ระบุ ให้ปรับได้ภายหลัง)
-- -----------------------------------------------------------------------------

create table public.system_setting (
  key         text primary key,
  value       jsonb not null,
  description text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);
comment on table  public.system_setting is 'ค่าตั้งค่าระบบที่ปรับได้ (key-value)';
comment on column public.system_setting.key is 'ชื่อค่าตั้งค่า';
comment on column public.system_setting.value is 'ค่า (jsonb) เช่น null, true, 10';
comment on column public.system_setting.description is 'คำอธิบายภาษาไทย';


-- -----------------------------------------------------------------------------
-- ฟังก์ชันกลาง
-- -----------------------------------------------------------------------------

-- อ่านค่าตั้งค่า (security definer เพราะตาราง system_setting เปิด RLS)
create or replace function public.get_setting(p_key text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select s.value from public.system_setting s where s.key = p_key;
$$;
comment on function public.get_setting(text) is 'คืนค่าตั้งค่าตาม key (null ถ้าไม่มี)';


-- -----------------------------------------------------------------------------
-- บทบาทและสิทธิ์ (ผูกสิทธิ์กับ role ผ่านตาราง ไม่ hardcode)
-- -----------------------------------------------------------------------------

create table public.app_role (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[A-Z][A-Z0-9_]*$'),
  name_th     text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);
comment on table  public.app_role is 'บทบาทในระบบ (EMPLOYEE, HR, FINANCE, SUPER_ADMIN, ...)';
comment on column public.app_role.code is 'รหัสบทบาท ตรงกับ ROLES ในแอป';
comment on column public.app_role.is_active is 'ปิดการใช้งานแทนการลบ';

create table public.permission (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique check (code ~ '^[a-z_]+\.[a-z_]+$'),
  description text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);
comment on table  public.permission is 'รายการสิทธิ์ที่ระบบตรวจ เช่น employee.update';
comment on column public.permission.code is 'รหัสสิทธิ์ รูปแบบ <หมวด>.<การกระทำ>';

create table public.role_permission (
  role_id       uuid not null references public.app_role(id),
  permission_id uuid not null references public.permission(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  primary key (role_id, permission_id)
);
comment on table public.role_permission is 'จับคู่บทบาทกับสิทธิ์ เพิ่ม/ลบแถวเพื่อโอนสิทธิ์ เช่นให้ HR แก้ข้อมูลพนักงาน';
create index role_permission_permission_id_idx on public.role_permission (permission_id);


-- -----------------------------------------------------------------------------
-- โครงสร้างองค์กร
-- -----------------------------------------------------------------------------

create table public.department (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  name_th              text not null,
  name_en              text,
  parent_department_id uuid references public.department(id),
  head_employee_id     uuid, -- FK เพิ่มหลังสร้างตาราง employee
  max_direct_reports   integer check (max_direct_reports is null or max_direct_reports > 0),
  is_active            boolean not null default true,
  deleted_at           timestamptz,
  deleted_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,
  updated_by           uuid,
  check (parent_department_id is null or parent_department_id <> id)
);
comment on table  public.department is 'หน่วยงาน (ฝ่าย/แผนก) ซ้อนเป็นลำดับชั้นผ่าน parent_department_id';
comment on column public.department.code is 'รหัสหน่วยงาน';
comment on column public.department.parent_department_id is 'หน่วยงานแม่ เช่น แผนกอยู่ใต้ฝ่าย (null = ระดับบนสุด)';
comment on column public.department.head_employee_id is 'หัวหน้าแผนก/ผู้ดูแลฝ่าย';
comment on column public.department.max_direct_reports is 'จำนวนลูกน้องโดยตรงสูงสุดของหัวหน้าในหน่วยงานนี้ (null = ใช้ค่า system_setting)';
comment on column public.department.deleted_at is 'soft delete: เวลาที่ยกเลิกหน่วยงาน';
create index department_parent_idx on public.department (parent_department_id);
create index department_head_idx on public.department (head_employee_id);

create table public.job_level (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name_th     text not null,
  rank_order  integer not null,
  is_active   boolean not null default true,
  deleted_at  timestamptz,
  deleted_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid
);
comment on table  public.job_level is 'ระดับพนักงาน (hierarchy level)';
comment on column public.job_level.rank_order is 'ลำดับระดับ ใช้เรียง/กรอง (ค่าน้อย = ระดับต้น)';

create table public.position (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null unique,
  name_th              text not null,
  name_en              text,
  default_job_level_id uuid references public.job_level(id),
  is_active            boolean not null default true,
  deleted_at           timestamptz,
  deleted_by           uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid,
  updated_by           uuid
);
comment on table  public.position is 'ตำแหน่งงาน';
comment on column public.position.default_job_level_id is 'ระดับเริ่มต้นของตำแหน่งนี้ (พนักงานแต่ละคนกำหนดเองได้)';
create index position_default_job_level_idx on public.position (default_job_level_id);


-- -----------------------------------------------------------------------------
-- พนักงาน
-- -----------------------------------------------------------------------------

create table public.employee (
  id                      uuid primary key default gen_random_uuid(),
  employee_code           text not null unique,
  auth_user_id            uuid unique references auth.users(id),

  -- ชื่อ
  title_th                text,
  first_name_th           text not null,
  last_name_th            text not null,
  first_name_en           text,
  last_name_en            text,
  nickname                text,

  -- ติดต่อ
  email                   text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone                   text,
  emergency_contact_name  text,
  emergency_contact_phone text,

  -- ที่อยู่
  address_line            text,
  subdistrict             text,
  district                text,
  province                text,
  postal_code             text check (postal_code is null or postal_code ~ '^[0-9]{5}$'),

  -- งาน
  department_id           uuid references public.department(id),
  position_id             uuid references public.position(id),
  job_level_id            uuid references public.job_level(id),
  manager_employee_id     uuid references public.employee(id),

  -- สถานะ
  employment_status       public.employment_status not null default 'active',
  hire_date               date not null,
  resigned_date           date,
  deceased_date           date,
  status_reason           text,

  -- soft delete
  deleted_at              timestamptz,
  deleted_by              uuid,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid,
  updated_by              uuid,

  constraint employee_not_own_manager  check (manager_employee_id is null or manager_employee_id <> id),
  constraint employee_resigned_has_date check (employment_status <> 'resigned' or resigned_date is not null),
  constraint employee_deceased_has_date check (employment_status <> 'deceased' or deceased_date is not null),
  constraint employee_resigned_after_hire check (resigned_date is null or resigned_date >= hire_date),
  constraint employee_deceased_after_hire check (deceased_date is null or deceased_date >= hire_date)
);
comment on table  public.employee is 'ข้อมูลพนักงาน ห้ามลบจริง ใช้ employment_status / deleted_at แทน';
comment on column public.employee.employee_code is 'รหัสพนักงาน (ตรงกับ users.employee_id เดิม) ไม่นำกลับมาใช้ซ้ำ';
comment on column public.employee.auth_user_id is 'บัญชี Supabase Auth ที่ผูกกับพนักงาน';
comment on column public.employee.title_th is 'คำนำหน้าชื่อ';
comment on column public.employee.first_name_th is 'ชื่อ (ไทย)';
comment on column public.employee.last_name_th is 'นามสกุล (ไทย)';
comment on column public.employee.email is 'อีเมลติดต่อ';
comment on column public.employee.phone is 'เบอร์โทรศัพท์';
comment on column public.employee.emergency_contact_name is 'ผู้ติดต่อกรณีฉุกเฉิน';
comment on column public.employee.address_line is 'บ้านเลขที่ ถนน ซอย';
comment on column public.employee.subdistrict is 'ตำบล/แขวง';
comment on column public.employee.district is 'อำเภอ/เขต';
comment on column public.employee.province is 'จังหวัด';
comment on column public.employee.postal_code is 'รหัสไปรษณีย์ 5 หลัก';
comment on column public.employee.department_id is 'แผนกที่สังกัด';
comment on column public.employee.position_id is 'ตำแหน่ง';
comment on column public.employee.job_level_id is 'ระดับ';
comment on column public.employee.manager_employee_id is 'หัวหน้าโดยตรง (หัวหน้า 1 คน มีลูกน้องได้หลายคน)';
comment on column public.employee.employment_status is 'สถานะ ทำงานอยู่/ลาออก/เสียชีวิต';
comment on column public.employee.hire_date is 'วันเริ่มงาน';
comment on column public.employee.resigned_date is 'วันที่ลาออก (บังคับเมื่อสถานะ resigned)';
comment on column public.employee.deceased_date is 'วันที่เสียชีวิต (บังคับเมื่อสถานะ deceased)';
comment on column public.employee.status_reason is 'เหตุผลการเปลี่ยนสถานะ';
comment on column public.employee.deleted_at is 'soft delete: เวลาที่ซ่อนเรคคอร์ด (เช่นบันทึกผิด)';

-- อีเมลห้ามซ้ำในพนักงานที่ยังไม่ถูก soft delete
create unique index employee_email_active_uniq on public.employee (lower(email)) where deleted_at is null;
create index employee_department_idx on public.employee (department_id);
create index employee_position_idx on public.employee (position_id);
create index employee_job_level_idx on public.employee (job_level_id);
create index employee_manager_idx on public.employee (manager_employee_id);
create index employee_status_idx on public.employee (employment_status);

alter table public.department
  add constraint department_head_employee_fk foreign key (head_employee_id) references public.employee(id);


-- ผู้ใช้กับบทบาท (หนึ่งคนมีได้หลายบทบาท, ยกเลิกด้วย revoked_at)
create table public.user_role (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employee(id),
  role_id     uuid not null references public.app_role(id),
  granted_by  uuid references public.employee(id),
  granted_at  timestamptz not null default now(),
  revoked_by  uuid references public.employee(id),
  revoked_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  check (revoked_at is null or revoked_at >= granted_at)
);
comment on table  public.user_role is 'การมอบบทบาทให้พนักงาน (Grant สิทธิ์) ยกเลิกด้วย revoked_at ไม่ลบแถว';
comment on column public.user_role.granted_by is 'ผู้มอบสิทธิ์';
comment on column public.user_role.revoked_at is 'เวลาที่ยกเลิกสิทธิ์ (null = ยังใช้งาน)';
create unique index user_role_active_uniq on public.user_role (employee_id, role_id) where revoked_at is null;
create index user_role_role_idx on public.user_role (role_id);
create index user_role_granted_by_idx on public.user_role (granted_by);
create index user_role_revoked_by_idx on public.user_role (revoked_by);


-- ประวัติการทำงาน (trigger สร้างให้อัตโนมัติจากการเปลี่ยนแปลงของ employee)
create table public.work_history (
  id                  uuid primary key default gen_random_uuid(),
  employee_id         uuid not null references public.employee(id),
  change_type         public.work_change_type not null,
  department_id       uuid references public.department(id),
  position_id         uuid references public.position(id),
  job_level_id        uuid references public.job_level(id),
  manager_employee_id uuid references public.employee(id),
  employment_status   public.employment_status not null,
  effective_date      date not null,
  end_date            date,
  note                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid,
  updated_by          uuid,
  check (end_date is null or end_date >= effective_date)
);
comment on table  public.work_history is 'ประวัติการทำงาน: snapshot แผนก/ตำแหน่ง/ระดับ/หัวหน้า/สถานะ แต่ละช่วงเวลา';
comment on column public.work_history.change_type is 'เหตุการณ์ที่ทำให้เกิดช่วงใหม่';
comment on column public.work_history.effective_date is 'วันที่มีผล';
comment on column public.work_history.end_date is 'วันสิ้นสุดช่วง (null = ช่วงปัจจุบัน)';
create index work_history_employee_idx on public.work_history (employee_id, effective_date desc);
create index work_history_department_idx on public.work_history (department_id);
create index work_history_position_idx on public.work_history (position_id);
create index work_history_job_level_idx on public.work_history (job_level_id);
create index work_history_manager_idx on public.work_history (manager_employee_id);


-- -----------------------------------------------------------------------------
-- ตัวตนผู้ใช้ปัจจุบัน
-- -----------------------------------------------------------------------------

-- คืน employee.id ของผู้ที่ล็อกอินอยู่ (null = service role / ระบบ)
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.id
  from public.employee e
  where e.auth_user_id = (select auth.uid())
    and e.deleted_at is null;
$$;
comment on function public.current_employee_id() is 'employee.id ของผู้ใช้ที่ล็อกอิน (จาก auth.uid())';


-- -----------------------------------------------------------------------------
-- Trigger: created_* / updated_* อัตโนมัติ (แอปกำหนดเองไม่ได้)
-- -----------------------------------------------------------------------------

create or replace function public.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := public.current_employee_id();
  else
    -- ห้ามแก้ข้อมูลผู้สร้าง
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := public.current_employee_id();
  return new;
end;
$$;
comment on function public.set_audit_columns() is 'ตั้งค่า created_at/by, updated_at/by อัตโนมัติ';

do $$
declare
  t text;
begin
  foreach t in array array[
    'system_setting', 'app_role', 'permission', 'role_permission',
    'department', 'job_level', 'position', 'employee', 'user_role', 'work_history'
  ] loop
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()',
      t || '_set_audit_columns', t);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- Trigger: ห้ามลบจริง (ใช้ soft delete / เปลี่ยนสถานะ)
-- -----------------------------------------------------------------------------

create or replace function public.prevent_hard_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ห้ามลบข้อมูลจากตาราง %.% ให้ใช้ soft delete หรือเปลี่ยนสถานะแทน', tg_table_schema, tg_table_name
    using errcode = 'P0001';
end;
$$;
comment on function public.prevent_hard_delete() is 'บล็อกคำสั่ง DELETE เพื่อคงประวัติ';

-- role_permission ไม่อยู่ในรายการ: การถอดสิทธิ์ออกจาก role คือการลบแถว (บันทึกใน audit_log ขั้น 3)
do $$
declare
  t text;
begin
  foreach t in array array[
    'system_setting', 'app_role', 'permission',
    'department', 'job_level', 'position', 'employee', 'user_role', 'work_history'
  ] loop
    execute format(
      'create trigger %I before delete on public.%I
         for each row execute function public.prevent_hard_delete()',
      t || '_prevent_hard_delete', t);
    execute format('revoke delete on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- soft delete: ใส่ deleted_by อัตโนมัติ และห้ามล้าง deleted_at ย้อนกลับโดยไม่ตั้งใจ
create or replace function public.set_deleted_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := public.current_employee_id();
  elsif new.deleted_at is null then
    new.deleted_by := null;
  else
    new.deleted_by := old.deleted_by;
  end if;
  return new;
end;
$$;
comment on function public.set_deleted_by() is 'บันทึกผู้ทำ soft delete อัตโนมัติ';

do $$
declare
  t text;
begin
  foreach t in array array['department', 'job_level', 'position', 'employee'] loop
    execute format(
      'create trigger %I before update of deleted_at on public.%I
         for each row execute function public.set_deleted_by()',
      t || '_set_deleted_by', t);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- Trigger: กติกาของพนักงาน
-- -----------------------------------------------------------------------------

create or replace function public.validate_employee()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_limit       integer;
  v_count       integer;
  v_max_depth   integer;
  v_depth_above integer;
  v_depth_below integer;
  v_has_cycle   boolean;
begin
  -- เปลี่ยนสถานะ: ต้องมีเหตุผลถ้าตั้งค่าไว้
  if tg_op = 'UPDATE' and new.employment_status is distinct from old.employment_status then
    if coalesce((public.get_setting('require_status_reason') #>> '{}')::boolean, false)
       and (coalesce(btrim(new.status_reason), '') = ''
            or new.status_reason is not distinct from old.status_reason) then
      raise exception 'ต้องระบุเหตุผลในการเปลี่ยนสถานะ (status_reason)' using errcode = 'P0001';
    end if;

    -- กลับมาทำงานใหม่หลังลาออก/เสียชีวิต
    if old.employment_status in ('resigned', 'deceased') and new.employment_status = 'active'
       and not coalesce((public.get_setting('allow_rehire') #>> '{}')::boolean, false) then
      raise exception 'ระบบตั้งค่าไม่อนุญาตให้เปลี่ยนพนักงานที่ % กลับเป็น active', old.employment_status
        using errcode = 'P0001';
    end if;
  end if;

  -- ตรวจหัวหน้าโดยตรงเมื่อมีการกำหนดหรือเปลี่ยน
  if new.manager_employee_id is not null
     and (tg_op = 'INSERT' or new.manager_employee_id is distinct from old.manager_employee_id) then

    if not exists (
      select 1 from public.employee m
      where m.id = new.manager_employee_id
        and m.deleted_at is null
        and m.employment_status = 'active'
    ) then
      raise exception 'หัวหน้าที่เลือกต้องเป็นพนักงานที่ทำงานอยู่' using errcode = 'P0001';
    end if;

    -- ห้ามวงวน: เดินขึ้นจากหัวหน้าใหม่ ต้องไม่เจอตัวเอง
    with recursive chain as (
      select e.id, e.manager_employee_id, 1 as depth
      from public.employee e where e.id = new.manager_employee_id
      union all
      select e.id, e.manager_employee_id, c.depth + 1
      from public.employee e join chain c on e.id = c.manager_employee_id
      where c.depth < 1000
    )
    select bool_or(id = new.id), max(depth) into v_has_cycle, v_depth_above from chain;

    if v_has_cycle then
      raise exception 'การกำหนดหัวหน้านี้ทำให้สายบังคับบัญชาวนกลับมาที่ตัวเอง' using errcode = 'P0001';
    end if;

    -- ความลึกของสายบังคับบัญชา
    v_max_depth := (public.get_setting('max_hierarchy_depth') #>> '{}')::integer;
    if v_max_depth is not null then
      with recursive sub as (
        select e.id, 0 as depth from public.employee e
        where e.manager_employee_id = new.id and e.deleted_at is null
        union all
        select e.id, s.depth + 1
        from public.employee e join sub s on e.manager_employee_id = s.id
        where e.deleted_at is null and s.depth < 1000
      )
      select coalesce(max(depth) + 1, 0) into v_depth_below from sub;

      if v_depth_above + 1 + v_depth_below > v_max_depth then
        raise exception 'สายบังคับบัญชาลึกเกินค่าที่ตั้งไว้ (% ชั้น)', v_max_depth using errcode = 'P0001';
      end if;
    end if;
  end if;

  -- จำนวนลูกน้องโดยตรงสูงสุดของหัวหน้า (นับเฉพาะคนที่ทำงานอยู่)
  if new.manager_employee_id is not null and new.employment_status = 'active' and new.deleted_at is null
     and (tg_op = 'INSERT'
          or new.manager_employee_id is distinct from old.manager_employee_id
          or old.employment_status <> 'active'
          or old.deleted_at is not null) then

    select coalesce(d.max_direct_reports, (public.get_setting('max_direct_reports') #>> '{}')::integer)
      into v_limit
    from public.employee m
    left join public.department d on d.id = m.department_id
    where m.id = new.manager_employee_id;

    if v_limit is not null then
      select count(*) into v_count
      from public.employee e
      where e.manager_employee_id = new.manager_employee_id
        and e.id <> new.id
        and e.employment_status = 'active'
        and e.deleted_at is null;

      if v_count + 1 > v_limit then
        raise exception 'หัวหน้าคนนี้มีลูกน้องครบจำนวนสูงสุดแล้ว (% คน)', v_limit using errcode = 'P0001';
      end if;
    end if;
  end if;

  return new;
end;
$$;
comment on function public.validate_employee() is 'ตรวจกติกา: เหตุผลเปลี่ยนสถานะ, การกลับมาทำงาน, หัวหน้า (วงวน/ความลึก/จำนวนลูกน้อง)';

create trigger employee_validate
  before insert or update on public.employee
  for each row execute function public.validate_employee();


-- -----------------------------------------------------------------------------
-- Trigger: กติกาของหน่วยงาน
-- -----------------------------------------------------------------------------

create or replace function public.validate_department()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_has_cycle boolean;
begin
  -- ห้ามวงวนของหน่วยงานแม่
  if new.parent_department_id is not null
     and (tg_op = 'INSERT' or new.parent_department_id is distinct from old.parent_department_id) then
    with recursive chain as (
      select d.id, d.parent_department_id, 1 as depth
      from public.department d where d.id = new.parent_department_id
      union all
      select d.id, d.parent_department_id, c.depth + 1
      from public.department d join chain c on d.id = c.parent_department_id
      where c.depth < 1000
    )
    select bool_or(id = new.id) into v_has_cycle from chain;

    if v_has_cycle then
      raise exception 'หน่วยงานแม่วนกลับมาที่ตัวเอง' using errcode = 'P0001';
    end if;
  end if;

  -- ตรวจหัวหน้าหน่วยงาน
  if new.head_employee_id is not null
     and (tg_op = 'INSERT' or new.head_employee_id is distinct from old.head_employee_id) then
    if not exists (
      select 1 from public.employee e
      where e.id = new.head_employee_id
        and e.deleted_at is null
        and e.employment_status = 'active'
        and (not coalesce((public.get_setting('head_must_belong_to_department') #>> '{}')::boolean, false)
             or e.department_id = new.id)
    ) then
      raise exception 'หัวหน้าหน่วยงานต้องเป็นพนักงานที่ทำงานอยู่ (และสังกัดหน่วยงานนี้ถ้าตั้งค่าไว้)'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;
comment on function public.validate_department() is 'ตรวจกติกา: วงวนหน่วยงานแม่, คุณสมบัติหัวหน้าหน่วยงาน';

create trigger department_validate
  before insert or update on public.department
  for each row execute function public.validate_department();


-- -----------------------------------------------------------------------------
-- Trigger: สร้างประวัติการทำงานอัตโนมัติ
-- -----------------------------------------------------------------------------

create or replace function public.record_work_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type public.work_change_type;
  v_date date;
begin
  if tg_op = 'INSERT' then
    v_type := 'hire';
    v_date := new.hire_date;
  else
    -- เลือกประเภทตามความสำคัญ ถ้าเปลี่ยนหลายอย่างพร้อมกัน snapshot จะเก็บครบทุกค่าอยู่แล้ว
    if new.employment_status is distinct from old.employment_status then
      v_type := 'status_change';
      v_date := case new.employment_status
                  when 'resigned' then new.resigned_date
                  when 'deceased' then new.deceased_date
                  else current_date
                end;
    elsif new.department_id is distinct from old.department_id then
      v_type := 'transfer';
    elsif new.position_id is distinct from old.position_id
       or new.job_level_id is distinct from old.job_level_id then
      v_type := 'position_change';
    elsif new.manager_employee_id is distinct from old.manager_employee_id then
      v_type := 'manager_change';
    else
      return null; -- ไม่มีการเปลี่ยนที่เกี่ยวกับประวัติการทำงาน
    end if;
    v_date := coalesce(v_date, current_date);

    -- ปิดช่วงปัจจุบัน
    update public.work_history wh
       set end_date = greatest(wh.effective_date, v_date)
     where wh.employee_id = new.id and wh.end_date is null;
  end if;

  insert into public.work_history (
    employee_id, change_type, department_id, position_id, job_level_id,
    manager_employee_id, employment_status, effective_date, note
  ) values (
    new.id, v_type, new.department_id, new.position_id, new.job_level_id,
    new.manager_employee_id, new.employment_status, v_date,
    case when v_type = 'status_change' then new.status_reason end
  );

  return null;
end;
$$;
comment on function public.record_work_history() is 'เพิ่มแถว work_history เมื่อเริ่มงานหรือเปลี่ยนแผนก/ตำแหน่ง/ระดับ/หัวหน้า/สถานะ';

create trigger employee_record_work_history
  after insert or update of department_id, position_id, job_level_id, manager_employee_id, employment_status
  on public.employee
  for each row execute function public.record_work_history();


-- -----------------------------------------------------------------------------
-- เปิด RLS ทุกตาราง (policy เพิ่มในขั้น 4)
-- -----------------------------------------------------------------------------

alter table public.system_setting  enable row level security;
alter table public.app_role        enable row level security;
alter table public.permission      enable row level security;
alter table public.role_permission enable row level security;
alter table public.department      enable row level security;
alter table public.job_level       enable row level security;
alter table public.position        enable row level security;
alter table public.employee        enable row level security;
alter table public.user_role       enable row level security;
alter table public.work_history    enable row level security;

-- ฟังก์ชันภายใน ไม่เปิดให้เรียกผ่าน API โดยตรง
revoke execute on function public.get_setting(text) from public, anon;
revoke execute on function public.current_employee_id() from public, anon;
-- trigger ที่ทำงานในสิทธิ์ผู้เรียกต้องใช้ 2 ฟังก์ชันนี้
grant execute on function public.get_setting(text) to authenticated, service_role;
grant execute on function public.current_employee_id() to authenticated, service_role;
revoke execute on function public.set_audit_columns() from public, anon, authenticated;
revoke execute on function public.prevent_hard_delete() from public, anon, authenticated;
revoke execute on function public.set_deleted_by() from public, anon, authenticated;
revoke execute on function public.validate_employee() from public, anon, authenticated;
revoke execute on function public.validate_department() from public, anon, authenticated;
revoke execute on function public.record_work_history() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- ข้อมูลอ้างอิงที่ระบบต้องมี (ไม่ใช่ข้อมูลตัวอย่าง)
-- -----------------------------------------------------------------------------

insert into public.system_setting (key, value, description) values
  ('max_direct_reports',             'null',  'จำนวนลูกน้องโดยตรงสูงสุดต่อหัวหน้า (null = ไม่จำกัด) เอกสารเว้นว่างไว้'),
  ('head_must_belong_to_department', 'false', 'หัวหน้าหน่วยงานต้องสังกัดหน่วยงานนั้นหรือไม่'),
  ('max_hierarchy_depth',            'null',  'ความลึกสูงสุดของสายบังคับบัญชา (null = ไม่จำกัด)'),
  ('allow_rehire',                   'false', 'อนุญาตให้เปลี่ยนพนักงานที่ลาออก/เสียชีวิตกลับเป็นทำงานอยู่'),
  ('require_status_reason',          'true',  'บังคับกรอกเหตุผลเมื่อเปลี่ยนสถานะพนักงาน'),
  ('allow_self_edit',                'false', 'ผู้มีสิทธิ์แก้ไขข้อมูลพนักงานแก้ข้อมูลของตัวเองได้หรือไม่ (ใช้ในขั้น 4)'),
  ('audit_retention_years',          'null',  'จำนวนปีที่เก็บ audit_log (null = เก็บตลอด)');

insert into public.app_role (code, name_th, description) values
  ('EMPLOYEE',    'พนักงาน',             'ผู้ใช้ทั่วไป'),
  ('HR',          'ฝ่ายบุคคล (HR)',       'จัดการข้อมูลพนักงาน'),
  ('FINANCE',     'ฝ่ายการเงิน (Finance)', 'ฝ่ายบัญชีการเงิน'),
  ('SUPER_ADMIN', 'Super Admin',         'ดูแลความเรียบร้อยของระบบ');

insert into public.permission (code, description) values
  ('employee.read',          'ดู/ค้นหา/กรองข้อมูลพนักงานทั้งหมด'),
  ('employee.update',        'แก้ไขข้อมูลพนักงาน (ชื่อ ติดต่อ ที่อยู่ ตำแหน่ง แผนก หัวหน้า)'),
  ('employee.change_status', 'เปลี่ยนสถานะ ทำงานอยู่/ลาออก/เสียชีวิต'),
  ('employee.create',        'เพิ่มพนักงานใหม่'),
  ('org.manage',             'จัดการหน่วยงาน ตำแหน่ง ระดับ และหัวหน้าหน่วยงาน'),
  ('audit.read',             'ดูประวัติการแก้ไข (audit_log)'),
  ('role.grant',             'มอบ/ยกเลิกบทบาทให้ผู้ใช้'),
  ('setting.manage',         'แก้ค่าตั้งค่าระบบ');

-- HR และ SUPER_ADMIN จัดการข้อมูลพนักงานได้ทั้งคู่, การมอบสิทธิ์และตั้งค่าระบบเป็นของ SUPER_ADMIN
insert into public.role_permission (role_id, permission_id)
select r.id, p.id
from public.app_role r
join public.permission p on
  (r.code in ('HR', 'SUPER_ADMIN') and p.code in (
     'employee.read', 'employee.update', 'employee.change_status', 'employee.create', 'org.manage', 'audit.read'))
  or (r.code = 'SUPER_ADMIN' and p.code in ('role.grant', 'setting.manage'));
