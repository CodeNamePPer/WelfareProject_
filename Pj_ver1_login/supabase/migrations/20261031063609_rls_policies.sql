-- =============================================================================
-- ขั้น 4: RLS ตามสิทธิ์ (role_permission) ไม่ hardcode ชื่อ role
--   - ทุก policy เรียก has_permission('<รหัสสิทธิ์>')
--   - anon เข้าไม่ได้ทุกตาราง
--   - service_role ข้าม RLS ตามปกติของ Supabase (ใช้ฝั่ง server เท่านั้น)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ฟังก์ชันตรวจสิทธิ์
-- -----------------------------------------------------------------------------

-- ผู้ใช้ปัจจุบันมีสิทธิ์นี้หรือไม่ (ต้องเป็นพนักงานที่ทำงานอยู่ และบทบาท/สิทธิ์ยังเปิดใช้)
create or replace function public.has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.employee e
    join public.user_role ur       on ur.employee_id = e.id and ur.revoked_at is null
    join public.app_role r         on r.id = ur.role_id and r.is_active
    join public.role_permission rp on rp.role_id = r.id
    join public.permission p       on p.id = rp.permission_id and p.is_active
    where e.auth_user_id = (select auth.uid())
      and e.deleted_at is null
      and e.employment_status = 'active'
      and p.code = p_code
  );
$$;
comment on function public.has_permission(text) is 'ตรวจว่าผู้ใช้ที่ล็อกอินมีสิทธิ์ตามรหัสหรือไม่ (ผ่าน user_role → role_permission)';

-- รายการสิทธิ์ของผู้ใช้ปัจจุบัน ให้แอปใช้ซ่อน/แสดงเมนู
create or replace function public.my_permissions()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct p.code order by p.code), '{}')
  from public.employee e
  join public.user_role ur       on ur.employee_id = e.id and ur.revoked_at is null
  join public.app_role r         on r.id = ur.role_id and r.is_active
  join public.role_permission rp on rp.role_id = r.id
  join public.permission p       on p.id = rp.permission_id and p.is_active
  where e.auth_user_id = (select auth.uid())
    and e.deleted_at is null
    and e.employment_status = 'active';
$$;
comment on function public.my_permissions() is 'คืนรหัสสิทธิ์ทั้งหมดของผู้ใช้ที่ล็อกอิน';

revoke execute on function public.has_permission(text) from public, anon;
revoke execute on function public.my_permissions() from public, anon;
grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.my_permissions() to authenticated, service_role;


-- -----------------------------------------------------------------------------
-- ตรวจสิทธิ์ระดับคอลัมน์ของ employee (RLS ทำระดับคอลัมน์ไม่ได้)
-- บังคับเฉพาะคำสั่งที่มาจากผู้ใช้ (authenticated) ไม่บังคับ service_role / migration
-- -----------------------------------------------------------------------------

create or replace function public.enforce_employee_permissions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := public.current_employee_id();
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- แก้ข้อมูลของตัวเอง
  if new.id = v_me and not coalesce((public.get_setting('allow_self_edit') #>> '{}')::boolean, false) then
    raise exception 'ไม่อนุญาตให้แก้ไขข้อมูลพนักงานของตัวเอง' using errcode = '42501';
  end if;

  -- เปลี่ยนสถานะ ต้องมี employee.change_status
  if (new.employment_status, new.resigned_date, new.deceased_date, new.status_reason)
     is distinct from (old.employment_status, old.resigned_date, old.deceased_date, old.status_reason)
     and not public.has_permission('employee.change_status') then
    raise exception 'ไม่มีสิทธิ์เปลี่ยนสถานะพนักงาน (employee.change_status)' using errcode = '42501';
  end if;

  -- ผูกบัญชีล็อกอิน ต้องมี role.grant (ป้องกันการสวมรอยตัวตน)
  if new.auth_user_id is distinct from old.auth_user_id and not public.has_permission('role.grant') then
    raise exception 'ไม่มีสิทธิ์เปลี่ยนบัญชีล็อกอินของพนักงาน (role.grant)' using errcode = '42501';
  end if;

  -- คอลัมน์อื่นทั้งหมด ต้องมี employee.update
  if (to_jsonb(new) - array['employment_status', 'resigned_date', 'deceased_date', 'status_reason', 'auth_user_id',
                            'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by'])
     is distinct from
     (to_jsonb(old) - array['employment_status', 'resigned_date', 'deceased_date', 'status_reason', 'auth_user_id',
                            'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_by'])
     and not public.has_permission('employee.update') then
    raise exception 'ไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน (employee.update)' using errcode = '42501';
  end if;

  return new;
end;
$$;
comment on function public.enforce_employee_permissions() is 'แยกสิทธิ์แก้ข้อมูลทั่วไป / เปลี่ยนสถานะ / ผูกบัญชี และกันการแก้ข้อมูลตัวเอง';
revoke execute on function public.enforce_employee_permissions() from public, anon, authenticated;

create trigger employee_enforce_permissions
  before update on public.employee
  for each row execute function public.enforce_employee_permissions();


-- -----------------------------------------------------------------------------
-- user_role: ผู้มอบ/ผู้ยกเลิกใส่อัตโนมัติ และห้ามมอบ/ยกเลิกบทบาทของตัวเอง
-- -----------------------------------------------------------------------------

create or replace function public.set_user_role_grantor()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_me uuid := public.current_employee_id();
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
comment on function public.set_user_role_grantor() is 'ใส่ผู้มอบ/ผู้ยกเลิกสิทธิ์อัตโนมัติ และกันการมอบสิทธิ์ให้ตัวเอง';
revoke execute on function public.set_user_role_grantor() from public, anon, authenticated;

create trigger user_role_set_grantor
  before insert or update on public.user_role
  for each row execute function public.set_user_role_grantor();


-- -----------------------------------------------------------------------------
-- สิทธิ์ระดับตาราง: anon ไม่ได้อะไรเลย
-- -----------------------------------------------------------------------------

revoke all on
  public.system_setting, public.app_role, public.permission, public.role_permission,
  public.department, public.job_level, public.position, public.employee,
  public.user_role, public.work_history, public.audit_log
from anon;

-- ตารางที่ trigger เขียนให้เท่านั้น ผู้ใช้เขียนตรงไม่ได้
revoke insert, update on public.work_history from authenticated;


-- -----------------------------------------------------------------------------
-- Policies
-- -----------------------------------------------------------------------------

-- พนักงาน
create policy employee_select on public.employee
  for select to authenticated
  using ((select public.has_permission('employee.read')));

create policy employee_insert on public.employee
  for insert to authenticated
  with check ((select public.has_permission('employee.create')));

-- รายละเอียดว่าแก้คอลัมน์ไหนได้ ตรวจใน enforce_employee_permissions()
create policy employee_update on public.employee
  for update to authenticated
  using ((select public.has_permission('employee.update')) or (select public.has_permission('employee.change_status')))
  with check ((select public.has_permission('employee.update')) or (select public.has_permission('employee.change_status')));

-- ประวัติการทำงาน (อ่านอย่างเดียว)
create policy work_history_select on public.work_history
  for select to authenticated
  using ((select public.has_permission('employee.read')));

-- โครงสร้างองค์กร: อ่านได้ถ้าดูพนักงานได้ (ใช้ทำตัวกรอง) แก้ได้ถ้ามี org.manage
create policy department_select on public.department
  for select to authenticated
  using ((select public.has_permission('employee.read')) or (select public.has_permission('org.manage')));
create policy department_insert on public.department
  for insert to authenticated
  with check ((select public.has_permission('org.manage')));
create policy department_update on public.department
  for update to authenticated
  using ((select public.has_permission('org.manage')))
  with check ((select public.has_permission('org.manage')));

create policy job_level_select on public.job_level
  for select to authenticated
  using ((select public.has_permission('employee.read')) or (select public.has_permission('org.manage')));
create policy job_level_insert on public.job_level
  for insert to authenticated
  with check ((select public.has_permission('org.manage')));
create policy job_level_update on public.job_level
  for update to authenticated
  using ((select public.has_permission('org.manage')))
  with check ((select public.has_permission('org.manage')));

create policy position_select on public.position
  for select to authenticated
  using ((select public.has_permission('employee.read')) or (select public.has_permission('org.manage')));
create policy position_insert on public.position
  for insert to authenticated
  with check ((select public.has_permission('org.manage')));
create policy position_update on public.position
  for update to authenticated
  using ((select public.has_permission('org.manage')))
  with check ((select public.has_permission('org.manage')));

-- บทบาทและสิทธิ์
create policy app_role_select on public.app_role
  for select to authenticated
  using ((select public.has_permission('role.grant')));
create policy app_role_insert on public.app_role
  for insert to authenticated
  with check ((select public.has_permission('role.grant')));
create policy app_role_update on public.app_role
  for update to authenticated
  using ((select public.has_permission('role.grant')))
  with check ((select public.has_permission('role.grant')));

create policy permission_select on public.permission
  for select to authenticated
  using ((select public.has_permission('role.grant')));

create policy role_permission_select on public.role_permission
  for select to authenticated
  using ((select public.has_permission('role.grant')));
create policy role_permission_insert on public.role_permission
  for insert to authenticated
  with check ((select public.has_permission('role.grant')));
create policy role_permission_delete on public.role_permission
  for delete to authenticated
  using ((select public.has_permission('role.grant')));

-- user_role: ดูของตัวเองได้เสมอ, ผู้มี role.grant ดู/มอบ/ยกเลิกของคนอื่นได้
create policy user_role_select on public.user_role
  for select to authenticated
  using (employee_id = (select public.current_employee_id()) or (select public.has_permission('role.grant')));
create policy user_role_insert on public.user_role
  for insert to authenticated
  with check ((select public.has_permission('role.grant')));
create policy user_role_update on public.user_role
  for update to authenticated
  using ((select public.has_permission('role.grant')))
  with check ((select public.has_permission('role.grant')));

-- ค่าตั้งค่า
create policy system_setting_select on public.system_setting
  for select to authenticated
  using ((select public.has_permission('setting.manage')));
create policy system_setting_update on public.system_setting
  for update to authenticated
  using ((select public.has_permission('setting.manage')))
  with check ((select public.has_permission('setting.manage')));

-- ประวัติการแก้ไข (อ่านอย่างเดียว)
create policy audit_log_select on public.audit_log
  for select to authenticated
  using ((select public.has_permission('audit.read')));
