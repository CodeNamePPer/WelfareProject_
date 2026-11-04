-- =============================================================================
-- ตารางสวัสดิการฝั่ง Admin (หน้า /admin/benefits)
--   welfare_benefit            รายการสวัสดิการ (แทน welfareItems ใน src/data/mock.ts)
--   welfare_benefit_limit      วงเงินตามช่วงเวลา: ปรับวงเงินล่วงหน้าได้โดยไม่ทับค่าที่ใช้อยู่
--   welfare_benefit_department แผนกที่มีสิทธิ์ (ไม่มีแถว = ทุกแผนก)
--   welfare_import_batch       ประวัติการนำเข้าไฟล์ (เพิ่มได้อย่างเดียว)
--
-- ขอบเขต: ไม่มีคำขอเบิก (claims) เพราะใช้ร่วมกับฝั่งพนักงาน/HR ต้องตกลงโครงสร้างร่วมกันก่อน
-- ประวัติการแก้ไข: แอปเขียน audit_logs เอง (ไม่มี trigger audit ระดับ DB แล้ว ดู 20261031171000)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล
-- -----------------------------------------------------------------------------

create type public.welfare_budget_type as enum ('yearly', 'monthly', 'per_claim');
comment on type public.welfare_budget_type is 'รอบวงเงิน: yearly=รายปี, monthly=รายเดือน, per_claim=ต่อครั้ง';


-- -----------------------------------------------------------------------------
-- สิทธิ์
-- -----------------------------------------------------------------------------

insert into public.permission (code, description) values
  ('welfare.manage', 'เพิ่ม/แก้ไข/ปิดใช้สวัสดิการ และนำเข้าข้อมูลสวัสดิการ');

insert into public.role_permission (role_id, permission_id)
select r.id, p.id
from public.app_role r
join public.permission p on p.code = 'welfare.manage'
where r.code = 'SUPER_ADMIN';


-- -----------------------------------------------------------------------------
-- รายการสวัสดิการ
-- -----------------------------------------------------------------------------

create table public.welfare_benefit (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (code ~ '^WEL-[0-9]{3,}$'),
  name_th             text not null check (length(trim(name_th)) > 0),
  description         text,
  budget_type         public.welfare_budget_type not null,
  max_claims          integer check (max_claims is null or max_claims > 0),
  max_claims_note     text,
  eligibility_note    text,
  approver_role_id    uuid references public.app_role(id),
  required_documents  text[] not null default '{}',
  is_active           boolean not null default true,
  deleted_at          timestamptz,
  deleted_by          uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid,
  updated_by          uuid
);
comment on table  public.welfare_benefit is 'รายการสวัสดิการที่ Admin กำหนด วงเงินอยู่ใน welfare_benefit_limit';
comment on column public.welfare_benefit.code is 'รหัสสวัสดิการ เช่น WEL-001 ใช้เป็น target_id ใน audit_logs';
comment on column public.welfare_benefit.max_claims is 'จำนวนครั้งที่เบิกได้ต่อรอบ budget_type (null = ไม่จำกัด)';
comment on column public.welfare_benefit.max_claims_note is 'เงื่อนไขจำนวนครั้งที่เป็นข้อความ เช่น "ต่อการคลอด 1 ครั้ง"';
comment on column public.welfare_benefit.eligibility_note is 'เงื่อนไขผู้มีสิทธิ์เพิ่มเติม เช่น "พนักงานประจำ" (แผนกอยู่ใน welfare_benefit_department)';
comment on column public.welfare_benefit.approver_role_id is 'บทบาทที่ตรวจคำขอเบิกขั้นแรก';
comment on column public.welfare_benefit.required_documents is 'เอกสารที่ผู้เบิกต้องแนบ';
comment on column public.welfare_benefit.is_active is 'false = หยุดใช้ (ยื่นเบิกใหม่ไม่ได้ แต่ประวัติยังอยู่)';
comment on column public.welfare_benefit.deleted_at is 'soft delete: สร้างผิด/ยกเลิกก่อนใช้งาน';

create index welfare_benefit_active_idx on public.welfare_benefit (is_active) where deleted_at is null;


-- -----------------------------------------------------------------------------
-- วงเงินตามช่วงเวลา
--   ปรับวงเงิน = เพิ่มแถวใหม่ที่มี effective_from ใหม่ ไม่แก้แถวเดิม
--   วงเงินที่ใช้วันนี้ = แถวที่ effective_from ล่าสุดที่ <= วันนี้
-- -----------------------------------------------------------------------------

create table public.welfare_benefit_limit (
  id              uuid primary key default gen_random_uuid(),
  benefit_id      uuid not null references public.welfare_benefit(id),
  amount          numeric(12, 2) not null check (amount >= 0),
  effective_from  date not null,
  reason          text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  unique (benefit_id, effective_from)
);
comment on table  public.welfare_benefit_limit is 'ประวัติวงเงินต่อคนต่อรอบ แต่ละแถวมีผลตั้งแต่ effective_from จนกว่าจะมีแถวถัดไป';
comment on column public.welfare_benefit_limit.amount is 'วงเงิน (บาท) ต่อคนต่อรอบ budget_type';
comment on column public.welfare_benefit_limit.effective_from is 'วันที่เริ่มใช้วงเงินนี้';
comment on column public.welfare_benefit_limit.reason is 'เหตุผลการปรับวงเงิน';

-- วงเงินที่มีผลแล้วห้ามแก้ (แก้ได้เฉพาะแถวที่ยังไม่ถึงวันมีผล)
create or replace function public.guard_welfare_limit_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.effective_from <= current_date then
    raise exception 'วงเงินที่มีผลแล้วแก้ไขไม่ได้ ให้เพิ่มวงเงินใหม่พร้อมวันที่มีผลแทน'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
comment on function public.guard_welfare_limit_update() is 'บล็อกการแก้วงเงินที่มีผลไปแล้ว เพื่อให้ยอดที่เบิกไปแล้วอ้างอิงวงเงินเดิมได้';

create trigger welfare_benefit_limit_guard_update
  before update on public.welfare_benefit_limit
  for each row execute function public.guard_welfare_limit_update();

create view public.v_welfare_benefit_current
with (security_invoker = true) as
select
  b.*,
  cur.amount         as current_amount,
  cur.effective_from as current_effective_from,
  nxt.amount         as next_amount,
  nxt.effective_from as next_effective_from
from public.welfare_benefit b
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.effective_from <= current_date
  order by l.effective_from desc
  limit 1
) cur on true
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.effective_from > current_date
  order by l.effective_from
  limit 1
) nxt on true
where b.deleted_at is null;
comment on view public.v_welfare_benefit_current is 'สวัสดิการพร้อมวงเงินที่ใช้วันนี้ และวงเงินถัดไปที่ตั้งไว้ล่วงหน้า (ถ้ามี)';


-- -----------------------------------------------------------------------------
-- แผนกที่มีสิทธิ์
-- -----------------------------------------------------------------------------

create table public.welfare_benefit_department (
  benefit_id     uuid not null references public.welfare_benefit(id),
  department_id  uuid not null references public.department(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid,
  updated_by     uuid,
  primary key (benefit_id, department_id)
);
comment on table public.welfare_benefit_department is 'แผนกที่มีสิทธิ์ในสวัสดิการ ไม่มีแถวของสวัสดิการนั้น = ทุกแผนกมีสิทธิ์';
create index welfare_benefit_department_department_idx on public.welfare_benefit_department (department_id);


-- -----------------------------------------------------------------------------
-- ประวัติการนำเข้าไฟล์ (เพิ่มได้อย่างเดียว)
-- -----------------------------------------------------------------------------

create table public.welfare_import_batch (
  id            bigint generated always as identity primary key,
  import_type   text not null check (import_type in ('claim_history', 'employee')),
  file_name     text not null,
  total_rows    integer not null check (total_rows >= 0),
  success_rows  integer not null check (success_rows >= 0),
  failed_rows   integer not null check (failed_rows >= 0),
  result        text generated always as (
                  case
                    when failed_rows = 0 then 'success'
                    when success_rows = 0 then 'failed'
                    else 'partial'
                  end
                ) stored,
  errors        jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  created_by    text,
  check (success_rows + failed_rows = total_rows),
  check (jsonb_typeof(errors) = 'array')
);
comment on table  public.welfare_import_batch is 'การนำเข้าไฟล์แต่ละครั้ง (ไฟล์อะไร กี่แถว สำเร็จ/ไม่สำเร็จ) เพิ่มได้อย่างเดียว';
comment on column public.welfare_import_batch.import_type is 'claim_history=ประวัติเบิกย้อนหลัง, employee=รายชื่อพนักงาน';
comment on column public.welfare_import_batch.result is 'success / partial / failed คำนวณจากจำนวนแถว';
comment on column public.welfare_import_batch.errors is 'แถวที่ไม่ผ่าน รูปแบบ [{"row": 3, "message": "..."}]';
comment on column public.welfare_import_batch.created_by is 'employee_id ของผู้นำเข้า (รูปแบบเดียวกับ audit_logs.user_id)';

create index welfare_import_batch_created_at_idx on public.welfare_import_batch (created_at desc);


-- -----------------------------------------------------------------------------
-- trigger กลาง (ฟังก์ชันจากขั้น 2)
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['welfare_benefit', 'welfare_benefit_limit', 'welfare_benefit_department'] loop
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()',
      t || '_set_audit_columns', t);
  end loop;

  -- ห้ามลบจริง: สวัสดิการใช้ soft delete / is_active, วงเงินเก็บเป็นประวัติ
  foreach t in array array['welfare_benefit', 'welfare_benefit_limit'] loop
    execute format(
      'create trigger %I before delete on public.%I
         for each row execute function public.prevent_hard_delete()',
      t || '_prevent_hard_delete', t);
  end loop;
end;
$$;

create trigger welfare_benefit_set_deleted_by
  before update of deleted_at on public.welfare_benefit
  for each row execute function public.set_deleted_by();

revoke execute on function public.guard_welfare_limit_update() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- RLS
--   อ่าน: ผู้ใช้ที่ล็อกอินเห็นสวัสดิการที่ยังไม่ถูกลบ (หน้าพนักงานต้องใช้แสดงสิทธิ์)
--   เขียน: ต้องมี welfare.manage
--   welfare_import_batch: service_role เท่านั้น เหมือน audit_logs
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit            enable row level security;
alter table public.welfare_benefit_limit      enable row level security;
alter table public.welfare_benefit_department enable row level security;
alter table public.welfare_import_batch       enable row level security;

revoke delete, truncate on public.welfare_benefit, public.welfare_benefit_limit from anon, authenticated;

create policy welfare_benefit_select on public.welfare_benefit
  for select to authenticated
  using (deleted_at is null or (select private.has_permission('welfare.manage')));
create policy welfare_benefit_insert on public.welfare_benefit
  for insert to authenticated
  with check ((select private.has_permission('welfare.manage')));
create policy welfare_benefit_update on public.welfare_benefit
  for update to authenticated
  using ((select private.has_permission('welfare.manage')))
  with check ((select private.has_permission('welfare.manage')));

create policy welfare_benefit_limit_select on public.welfare_benefit_limit
  for select to authenticated
  using (true);
create policy welfare_benefit_limit_insert on public.welfare_benefit_limit
  for insert to authenticated
  with check ((select private.has_permission('welfare.manage')));
create policy welfare_benefit_limit_update on public.welfare_benefit_limit
  for update to authenticated
  using ((select private.has_permission('welfare.manage')))
  with check ((select private.has_permission('welfare.manage')));

create policy welfare_benefit_department_select on public.welfare_benefit_department
  for select to authenticated
  using (true);
create policy welfare_benefit_department_insert on public.welfare_benefit_department
  for insert to authenticated
  with check ((select private.has_permission('welfare.manage')));
create policy welfare_benefit_department_delete on public.welfare_benefit_department
  for delete to authenticated
  using ((select private.has_permission('welfare.manage')));

revoke all on public.welfare_import_batch from public, anon, authenticated;
revoke update, delete, truncate on public.welfare_import_batch from service_role;


-- -----------------------------------------------------------------------------
-- audit_logs ใช้กับสวัสดิการด้วย
-- -----------------------------------------------------------------------------

comment on column public.audit_logs.target_id is
  'สิ่งที่ถูกแก้: employee_id ของผู้ใช้, รหัสสวัสดิการ (WEL-xxx) หรือ id ของ welfare_import_batch';
