-- =============================================================================
-- ขั้น 4 (แก้ตาม get_advisors): ย้ายฟังก์ชันช่วยที่เป็น SECURITY DEFINER ออกจาก schema public
--   เดิมผู้ใช้ที่ล็อกอินเรียกผ่าน /rest/v1/rpc/... ได้ตรง (lint 0029)
--   เช่น get_setting ทำให้อ่านค่าตั้งค่าได้ทั้งที่ policy จำกัดไว้เฉพาะ setting.manage
--   schema private ไม่ถูกเปิดผ่าน API แต่ policy และ trigger ยังเรียกใช้ได้
--   my_permissions() คงไว้ใน public เพราะตั้งใจให้แอปเรียก (คืนเฉพาะสิทธิ์ของผู้เรียกเอง)
-- =============================================================================

create schema if not exists private;
comment on schema private is 'ฟังก์ชันภายในที่ไม่เปิดผ่าน API';
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- policy อ้างฟังก์ชันด้วย OID จึงตามไปเองหลังย้าย schema
alter function public.get_setting(text) set schema private;
alter function public.current_employee_id() set schema private;
alter function public.has_permission(text) set schema private;

-- ฟังก์ชันที่เรียกฟังก์ชันช่วยด้วยชื่อเต็ม ต้องสร้างใหม่ให้ชี้ไป private

create or replace function public.set_audit_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := private.current_employee_id();
  else
    -- ห้ามแก้ข้อมูลผู้สร้าง
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := private.current_employee_id();
  return new;
end;
$$;

create or replace function public.set_deleted_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.deleted_by := private.current_employee_id();
  elsif new.deleted_at is null then
    new.deleted_by := null;
  else
    new.deleted_by := old.deleted_by;
  end if;
  return new;
end;
$$;

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
    if coalesce((private.get_setting('require_status_reason') #>> '{}')::boolean, false)
       and (coalesce(btrim(new.status_reason), '') = ''
            or new.status_reason is not distinct from old.status_reason) then
      raise exception 'ต้องระบุเหตุผลในการเปลี่ยนสถานะ (status_reason)' using errcode = 'P0001';
    end if;

    -- กลับมาทำงานใหม่หลังลาออก/เสียชีวิต
    if old.employment_status in ('resigned', 'deceased') and new.employment_status = 'active'
       and not coalesce((private.get_setting('allow_rehire') #>> '{}')::boolean, false) then
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
    v_max_depth := (private.get_setting('max_hierarchy_depth') #>> '{}')::integer;
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

    select coalesce(d.max_direct_reports, (private.get_setting('max_direct_reports') #>> '{}')::integer)
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
        and (not coalesce((private.get_setting('head_must_belong_to_department') #>> '{}')::boolean, false)
             or e.department_id = new.id)
    ) then
      raise exception 'หัวหน้าหน่วยงานต้องเป็นพนักงานที่ทำงานอยู่ (และสังกัดหน่วยงานนี้ถ้าตั้งค่าไว้)'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- คอลัมน์ที่ระบบจัดการเอง ไม่นับเป็นการแก้ไข
  c_ignored   constant text[] := array['created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by'];
  v_old       jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  v_new       jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
  v_row       jsonb := coalesce(v_new, v_old);
  v_changes   jsonb := '{}';
  v_action    text  := tg_op;
  v_record_id text;
  v_actor     uuid  := private.current_employee_id();
  v_roles     text[];
  v_key       text;
begin
  -- รวมคอลัมน์ที่เปลี่ยน
  for v_key in
    select k from jsonb_object_keys(coalesce(v_new, '{}') || coalesce(v_old, '{}')) as k
  loop
    continue when v_key = any (c_ignored);
    if (v_old -> v_key) is distinct from (v_new -> v_key) then
      v_changes := v_changes || jsonb_build_object(
        v_key, jsonb_build_object('old', v_old -> v_key, 'new', v_new -> v_key));
    end if;
  end loop;

  -- UPDATE ที่ไม่มีค่าเปลี่ยนจริง ไม่ต้องบันทึก
  if tg_op = 'UPDATE' and v_changes = '{}' then
    return null;
  end if;

  -- soft delete / กู้คืน
  if tg_op = 'UPDATE' and v_changes ? 'deleted_at' then
    if v_new ->> 'deleted_at' is not null and v_old ->> 'deleted_at' is null then
      v_action := 'SOFT_DELETE';
    elsif v_new ->> 'deleted_at' is null then
      v_action := 'RESTORE';
    end if;
  end if;

  v_record_id := coalesce(
    v_row ->> 'id',
    v_row ->> 'key',
    concat_ws(':', v_row ->> 'role_id', v_row ->> 'permission_id'));

  select coalesce(array_agg(r.code order by r.code), '{}') into v_roles
  from public.user_role ur
  join public.app_role r on r.id = ur.role_id
  where ur.employee_id = v_actor and ur.revoked_at is null;

  insert into public.audit_log (
    table_name, record_id, related_employee_id, action, changes,
    actor_roles, actor_db_role, created_by
  ) values (
    tg_table_name,
    v_record_id,
    case tg_table_name
      when 'employee' then (v_row ->> 'id')::uuid
      when 'work_history' then (v_row ->> 'employee_id')::uuid
      when 'user_role' then (v_row ->> 'employee_id')::uuid
    end,
    v_action,
    v_changes,
    v_roles,
    coalesce(nullif(current_setting('role', true), 'none'), session_user),
    v_actor
  );

  return null;
end;
$$;

create or replace function public.enforce_employee_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := private.current_employee_id();
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- แก้ข้อมูลของตัวเอง
  if new.id = v_me and not coalesce((private.get_setting('allow_self_edit') #>> '{}')::boolean, false) then
    raise exception 'ไม่อนุญาตให้แก้ไขข้อมูลพนักงานของตัวเอง' using errcode = '42501';
  end if;

  -- เปลี่ยนสถานะ ต้องมี employee.change_status
  if (new.employment_status, new.resigned_date, new.deceased_date, new.status_reason)
     is distinct from (old.employment_status, old.resigned_date, old.deceased_date, old.status_reason)
     and not private.has_permission('employee.change_status') then
    raise exception 'ไม่มีสิทธิ์เปลี่ยนสถานะพนักงาน (employee.change_status)' using errcode = '42501';
  end if;

  -- ผูกบัญชีล็อกอิน ต้องมี role.grant (ป้องกันการสวมรอยตัวตน)
  if new.auth_user_id is distinct from old.auth_user_id and not private.has_permission('role.grant') then
    raise exception 'ไม่มีสิทธิ์เปลี่ยนบัญชีล็อกอินของพนักงาน (role.grant)' using errcode = '42501';
  end if;

  -- คอลัมน์อื่นทั้งหมด ต้องมี employee.update
  if (to_jsonb(new) - array['employment_status', 'resigned_date', 'deceased_date', 'status_reason', 'auth_user_id',
                            'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by'])
     is distinct from
     (to_jsonb(old) - array['employment_status', 'resigned_date', 'deceased_date', 'status_reason', 'auth_user_id',
                            'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by'])
     and not private.has_permission('employee.update') then
    raise exception 'ไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน (employee.update)' using errcode = '42501';
  end if;

  return new;
end;
$$;

create or replace function public.set_user_role_grantor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := private.current_employee_id();
begin
  if current_user in ('authenticated', 'anon') and new.employee_id = v_me then
    raise exception 'ไม่อนุญาตให้มอบหรือยกเลิกบทบาทของตัวเอง' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.granted_by := v_me;
    new.granted_at := now();
    new.revoked_by := null;
    new.revoked_at := null;
  else
    -- แก้ได้เฉพาะการยกเลิก ห้ามเปลี่ยนตัวบุคคล/บทบาท หรือยกเลิกซ้ำ
    if new.employee_id <> old.employee_id or new.role_id <> old.role_id
       or new.granted_by is distinct from old.granted_by or new.granted_at <> old.granted_at then
      raise exception 'user_role แก้ได้เฉพาะการยกเลิกสิทธิ์ (revoked_at)' using errcode = 'P0001';
    end if;
    if old.revoked_at is not null then
      raise exception 'สิทธิ์นี้ถูกยกเลิกไปแล้ว ให้มอบใหม่เป็นแถวใหม่' using errcode = 'P0001';
    end if;
    if new.revoked_at is not null then
      new.revoked_by := v_me;
      new.revoked_at := now();
    end if;
  end if;
  return new;
end;
$$;
