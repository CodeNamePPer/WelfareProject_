-- =============================================================================
-- แก้บั๊กฐานข้อมูลจากการตรวจ (ระดับปานกลาง)
--   1. welfare_benefit_limit_select: วงเงินรายคน (+ เหตุผล) อ่านได้เฉพาะเจ้าของและผู้จัดการสวัสดิการ
--   2. welfare_claim_transition: เทียบยอดอนุมัติใหม่กับยอดอนุมัติเดิม (ไม่ใช่ยอดที่ขอ)
--      เดิม Finance อนุมัติยอดเดียวกับที่ HR ปรับไว้ จะถูกบันทึก amount_adjusted ซ้ำ และ amount_before ผิด
--   3. วันที่ "วันนี้" ใช้เวลาไทย: current_date ของ Postgres เป็น UTC จึงคลาด 1 วันช่วง 00:00–06:59 น.
--      (v_welfare_benefit_current, record_work_history · guard_welfare_limit_update อยู่ใน 20261119100000)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) RLS วงเงินรายคน
-- -----------------------------------------------------------------------------

drop policy if exists welfare_benefit_limit_select on public.welfare_benefit_limit;
create policy welfare_benefit_limit_select on public.welfare_benefit_limit
  for select to authenticated
  using (
    employee_id is null
    or employee_id = (select private.current_employee_id())
    or (select private.has_permission('welfare.manage'))
  );
comment on policy welfare_benefit_limit_select on public.welfare_benefit_limit is
  'วงเงินกลาง/ตามระดับอ่านได้ทุกคน · วงเงินรายคนอ่านได้เฉพาะเจ้าของและผู้มีสิทธิ์ welfare.manage';


-- -----------------------------------------------------------------------------
-- 2) เปลี่ยนสถานะคำขอ: เทียบกับยอดอนุมัติเดิม
-- -----------------------------------------------------------------------------

create or replace function public.welfare_claim_transition(
  p_claim_id        uuid,
  p_from            public.welfare_claim_status,
  p_to              public.welfare_claim_status,
  p_kind            public.welfare_claim_event_kind,
  p_actor           uuid,
  p_actor_role      text,
  p_note            text default null,
  p_amount_approved numeric default null,
  p_pay_round_id    uuid default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.welfare_claim_status;
  v_before numeric;
begin
  -- ยอดก่อนปรับ = ยอดอนุมัติล่าสุด (HR อาจปรับไว้แล้ว) ถ้ายังไม่มีจึงใช้ยอดที่ขอ
  select c.status, coalesce(c.amount_approved, c.amount_requested) into v_status, v_before
  from public.welfare_claim c
  where c.id = p_claim_id and c.deleted_at is null
  for update;

  if v_status is distinct from p_from then
    raise exception 'สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่' using errcode = 'P0001';
  end if;

  update public.welfare_claim
  set status = p_to,
      amount_approved = coalesce(p_amount_approved, amount_approved),
      pay_round_id = coalesce(p_pay_round_id, pay_round_id)
  where id = p_claim_id;

  if p_amount_approved is not null and p_amount_approved <> v_before then
    insert into public.welfare_claim_event (claim_id, kind, from_status, to_status, actor_employee_id, actor_role, note, amount_before, amount_after)
    values (p_claim_id, 'amount_adjusted', p_from, p_to, p_actor, p_actor_role, p_note, v_before, p_amount_approved);
  end if;

  insert into public.welfare_claim_event (claim_id, kind, from_status, to_status, actor_employee_id, actor_role, note)
  values (p_claim_id, p_kind, p_from, p_to, p_actor, p_actor_role, p_note);
end;
$$;
comment on function public.welfare_claim_transition is 'เปลี่ยนสถานะคำขอพร้อมบันทึกประวัติ ปฏิเสธถ้าสถานะเปลี่ยนไปแล้ว · ปรับยอดเทียบกับยอดอนุมัติเดิม';

revoke execute on function public.welfare_claim_transition(uuid, public.welfare_claim_status, public.welfare_claim_status, public.welfare_claim_event_kind, uuid, text, text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.welfare_claim_transition(uuid, public.welfare_claim_status, public.welfare_claim_status, public.welfare_claim_event_kind, uuid, text, text, numeric, uuid) to service_role;


-- -----------------------------------------------------------------------------
-- 3) วันที่ตามเวลาไทย
-- -----------------------------------------------------------------------------

create or replace view public.v_welfare_benefit_current
with (security_invoker = true) as
select
  b.id, b.code, b.name_th, b.description, b.budget_type, b.max_claims, b.max_claims_note, b.eligibility_note,
  b.approver_role_id, b.required_documents, b.is_active, b.deleted_at, b.deleted_by, b.created_at, b.updated_at,
  b.created_by, b.updated_by,
  cur.amount         as current_amount,
  cur.effective_from as current_effective_from,
  nxt.amount         as next_amount,
  nxt.effective_from as next_effective_from
from public.welfare_benefit b
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.employee_id is null and l.job_level_id is null and l.effective_from <= (now() at time zone 'Asia/Bangkok')::date
  order by l.effective_from desc
  limit 1
) cur on true
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.employee_id is null and l.job_level_id is null and l.effective_from > (now() at time zone 'Asia/Bangkok')::date
  order by l.effective_from
  limit 1
) nxt on true
where b.deleted_at is null;
comment on view public.v_welfare_benefit_current is 'สวัสดิการพร้อมวงเงินกลางที่ใช้วันนี้ และวงเงินกลางถัดไป (ไม่รวมวงเงินรายคนและวงเงินตามระดับ)';


-- guard_welfare_limit_update ใช้วันที่ตามเวลาไทยแล้วใน 20261119100000_fix_security_and_claim_guards.sql

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
                  else (now() at time zone 'Asia/Bangkok')::date
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
    v_date := coalesce(v_date, (now() at time zone 'Asia/Bangkok')::date);

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

comment on function public.record_work_history() is 'เพิ่มแถว work_history เมื่อเริ่มงานหรือเปลี่ยนแผนก/ตำแหน่ง/ระดับ/หัวหน้า/สถานะ (วันที่ตามเวลาไทย)';
