-- =============================================================================
-- ขั้น 3: audit_log และ trigger
--   - ทุก INSERT / UPDATE / DELETE ของตารางหลักถูกบันทึกอัตโนมัติด้วย trigger
--   - แอปเขียน log เองไม่ได้ และไม่มีใครแก้/ลบ log ได้ (รวม service_role)
--   - ตารางนี้ไม่มี updated_at / updated_by เพราะห้ามแก้ไขโดยหลักการ
-- =============================================================================


create table public.audit_log (
  id                  bigint generated always as identity primary key,
  table_name          text not null,
  record_id           text not null,
  related_employee_id uuid,
  action              text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'SOFT_DELETE', 'RESTORE')),
  changes             jsonb not null,
  actor_roles         text[] not null default '{}',
  actor_db_role       text not null,
  transaction_id      bigint not null default txid_current(),
  created_at          timestamptz not null default now(),
  created_by          uuid
);
comment on table  public.audit_log is 'ประวัติการแก้ไขข้อมูล (ใครแก้อะไร ค่าเดิม→ค่าใหม่ เมื่อไหร่) เพิ่มได้ด้วย trigger เท่านั้น ห้ามแก้/ลบ';
comment on column public.audit_log.table_name is 'ตารางที่ถูกแก้';
comment on column public.audit_log.record_id is 'คีย์ของแถวที่ถูกแก้ (ตารางคีย์คู่คั่นด้วย :)';
comment on column public.audit_log.related_employee_id is 'พนักงานที่เกี่ยวข้อง ใช้ดูประวัติทั้งหมดของพนักงานหนึ่งคน';
comment on column public.audit_log.action is 'INSERT=เพิ่ม, UPDATE=แก้ไข, DELETE=ลบ, SOFT_DELETE=ซ่อน, RESTORE=กู้คืน';
comment on column public.audit_log.changes is 'เฉพาะคอลัมน์ที่เปลี่ยน รูปแบบ {"คอลัมน์": {"old": ค่าเดิม, "new": ค่าใหม่}}';
comment on column public.audit_log.actor_roles is 'บทบาทของผู้แก้ ณ เวลานั้น';
comment on column public.audit_log.actor_db_role is 'role ของฐานข้อมูลที่ใช้แก้ (authenticated / service_role / postgres)';
comment on column public.audit_log.transaction_id is 'รหัส transaction ใช้จัดกลุ่มการแก้ที่เกิดพร้อมกัน';
comment on column public.audit_log.created_at is 'เวลาที่แก้';
comment on column public.audit_log.created_by is 'employee.id ของผู้แก้ (null = ระบบ/service role)';

create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);
create index audit_log_employee_idx on public.audit_log (related_employee_id, created_at desc);
create index audit_log_actor_idx on public.audit_log (created_by, created_at desc);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- ไม่มีใครเขียนตรงได้ อ่านได้ผ่าน RLS (ขั้น 4) / service_role
revoke insert, update, delete, truncate on public.audit_log from public, anon, authenticated, service_role;


-- -----------------------------------------------------------------------------
-- ป้องกันการเขียน/แก้/ลบ log
-- -----------------------------------------------------------------------------

create or replace function public.audit_log_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- INSERT ต้องมาจาก trigger ของตารางอื่นเท่านั้น (ความลึก trigger >= 2)
  if tg_op = 'INSERT' and pg_trigger_depth() >= 2 then
    return new;
  end if;
  raise exception 'audit_log เพิ่มได้จาก trigger เท่านั้น และห้ามแก้ไข/ลบ (%)', tg_op
    using errcode = 'P0001';
end;
$$;
comment on function public.audit_log_guard() is 'บล็อกการเขียน audit_log ตรง และบล็อก UPDATE/DELETE/TRUNCATE';

create trigger audit_log_guard_row
  before insert or update or delete on public.audit_log
  for each row execute function public.audit_log_guard();

create trigger audit_log_guard_truncate
  before truncate on public.audit_log
  for each statement execute function public.audit_log_guard();


-- -----------------------------------------------------------------------------
-- ฟังก์ชันบันทึก log (ผูกกับทุกตารางหลัก)
-- -----------------------------------------------------------------------------

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
  v_actor     uuid  := public.current_employee_id();
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
comment on function public.write_audit_log() is 'บันทึกการเปลี่ยนแปลงลง audit_log (ค่าเดิม→ค่าใหม่ ผู้แก้ เวลา)';

revoke execute on function public.write_audit_log() from public, anon, authenticated;
revoke execute on function public.audit_log_guard() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'system_setting', 'app_role', 'permission', 'role_permission',
    'department', 'job_level', 'position', 'employee', 'user_role', 'work_history'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.write_audit_log()',
      t || '_write_audit_log', t);
  end loop;
end;
$$;
