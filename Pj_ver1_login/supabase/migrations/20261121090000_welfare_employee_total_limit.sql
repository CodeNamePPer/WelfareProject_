-- =============================================================================
-- วงเงินรวมต่อปีรายคน (เพดานรวมทุกสวัสดิการ)
--
-- welfare_employee_total_limit: แต่ละแถวมีผลตั้งแต่ effective_from จนกว่าจะมีแถวถัดไป
--   amount มีค่า   = เพดานรวมต่อปีปฏิทิน (ตาม expense_date) ของทุกสวัสดิการ
--   amount เป็น null = ไม่จำกัด (ใช้ยกเลิกเพดานที่เคยตั้ง)
--   ไม่มีแถวเลย    = ไม่จำกัด (ค่าเริ่มต้น)
-- ปรับ = เพิ่มแถวใหม่ แก้หรือลบแถวเดิมไม่ได้ ตั้งได้เฉพาะหัวหน้า HR (ตรวจในแอป) และแอปเขียน audit_logs
--
-- เปลี่ยน logic ฐานข้อมูล 2 จุดใน guard_welfare_claim() (ส่วนอื่นเหมือน 20261119100000 ทุกบรรทัด):
--   1. advisory lock เป็นรายพนักงาน กันยื่นหลายสวัสดิการพร้อมกันจนเกินเพดานรวม
--   2. ตรวจเพดานรวมหลังตรวจวงเงินแยกสวัสดิการ
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ตาราง
-- -----------------------------------------------------------------------------

create table public.welfare_employee_total_limit (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employee(id),
  amount          numeric(12, 2) check (amount is null or amount >= 0),
  effective_from  date not null,
  reason          text not null check (length(btrim(reason)) > 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  unique (employee_id, effective_from)
);
comment on table  public.welfare_employee_total_limit is 'วงเงินรวมต่อปีของพนักงาน (ทุกสวัสดิการรวมกัน) แต่ละแถวมีผลตั้งแต่ effective_from จนกว่าจะมีแถวถัดไป';
comment on column public.welfare_employee_total_limit.amount is 'เพดานรวมต่อปีปฏิทิน (บาท) null = ไม่จำกัด';

create index welfare_employee_total_limit_employee_idx
  on public.welfare_employee_total_limit (employee_id, effective_from desc);

create trigger welfare_employee_total_limit_set_audit_columns
  before insert or update on public.welfare_employee_total_limit
  for each row execute function public.set_audit_columns();
create trigger welfare_employee_total_limit_prevent_hard_delete
  before delete on public.welfare_employee_total_limit
  for each row execute function public.prevent_hard_delete();

-- เก็บเป็นประวัติ: แก้แถวเดิมไม่ได้ ให้เพิ่มแถวใหม่พร้อมวันที่มีผลแทน
create or replace function public.guard_welfare_total_limit_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'วงเงินรวมแก้ไขไม่ได้ ให้เพิ่มวงเงินรวมใหม่พร้อมวันที่มีผลแทน' using errcode = 'P0001';
end;
$$;
revoke execute on function public.guard_welfare_total_limit_update() from public, anon, authenticated;

create trigger welfare_employee_total_limit_guard_update
  before update on public.welfare_employee_total_limit
  for each row execute function public.guard_welfare_total_limit_update();

-- อ่านและเขียนผ่าน service_role (แอปฝั่ง server) เท่านั้น
alter table public.welfare_employee_total_limit enable row level security;
revoke all on public.welfare_employee_total_limit from public, anon, authenticated;
grant select, insert on public.welfare_employee_total_limit to service_role;


-- -----------------------------------------------------------------------------
-- ยอดที่ใช้ไปหรือรอตรวจของทุกสวัสดิการในปีปฏิทิน (สูตรเดียวกับวงเงินแยกสวัสดิการ)
-- -----------------------------------------------------------------------------

create or replace function public.welfare_employee_year_usage(p_employee uuid, p_year integer, p_exclude uuid default null)
returns numeric
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(
    greatest(
      0,
      coalesce(c.amount_approved, c.amount_requested)
      + case when a.status = 'settled' and a.settlement = 'extra_payment' then coalesce(a.extra_amount_approved, 0) else 0 end
      - case when a.status = 'settled' and a.settlement = 'refund' then coalesce(a.refund_amount, 0) else 0 end
    )
  ), 0)
  from public.welfare_claim c
  left join public.welfare_claim_advance a on a.claim_id = c.id
  where c.employee_id = p_employee
    and (p_exclude is null or c.id <> p_exclude)
    and c.deleted_at is null
    and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
    and extract(year from c.expense_date) = p_year;
$$;
comment on function public.welfare_employee_year_usage(uuid, integer, uuid) is 'ยอดเบิกรวมทุกสวัสดิการของพนักงานในปีปฏิทิน (อนุมัติแล้ว + รอตรวจ รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้า)';
revoke execute on function public.welfare_employee_year_usage(uuid, integer, uuid) from public, anon, authenticated;
grant execute on function public.welfare_employee_year_usage(uuid, integer, uuid) to service_role;


-- -----------------------------------------------------------------------------
-- guard_welfare_claim: lock รายพนักงาน + ตรวจเพดานรวม
-- -----------------------------------------------------------------------------

create or replace function public.guard_welfare_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed      public.welfare_claim_status[];
  v_status     public.employment_status;
  v_level      uuid;
  v_budget     public.welfare_budget_type;
  v_active     boolean;
  v_max_claims integer;
  v_claims     integer;
  v_limit_id   uuid;
  v_limit      numeric;
  v_used       numeric;
  v_total_found boolean;
  v_total      numeric;
  v_total_used numeric;
  v_duplicate  text;
begin
  if tg_op = 'INSERT' then
    -- ประวัติย้อนหลังที่นำเข้าเท่านั้นที่เริ่มจากสถานะอื่นได้
    if new.import_batch_id is null and new.status not in ('draft', 'pending_hr') then
      raise exception 'คำขอใหม่ต้องเริ่มจากฉบับร่างหรือการยื่นคำขอ' using errcode = 'P0001';
    end if;
  elsif new.status <> old.status then
    allowed := case old.status
      when 'draft'            then array['pending_hr', 'cancelled']
      when 'pending_hr'       then array['needs_revision', 'pending_finance', 'rejected', 'cancelled']
      when 'needs_revision'   then array['pending_hr', 'cancelled']
      when 'pending_finance'  then array['awaiting_payment', 'finance_returned', 'rejected']
      when 'finance_returned' then array['pending_finance', 'needs_revision', 'rejected']
      when 'awaiting_payment' then array['paid', 'finance_returned', 'rejected']
      when 'paid'             then array['awaiting_payment']
      else array[]::text[]
    end::public.welfare_claim_status[];
    if not new.status = any(allowed) then
      raise exception 'เปลี่ยนสถานะคำขอจาก % เป็น % ไม่ได้', old.status, new.status using errcode = 'P0001';
    end if;
  end if;

  -- ตรวจทุกครั้งที่คำขอเข้าคิว HR ทั้งยื่นครั้งแรกและยื่นใหม่
  if new.status = 'pending_hr' and (tg_op = 'INSERT' or old.status <> 'pending_hr') then
    if new.amount_requested is null or new.expense_date is null then
      raise exception 'กรุณาระบุยอดเบิกและวันที่เกิดค่าใช้จ่ายก่อนยื่นคำขอ' using errcode = 'P0001';
    end if;

    select e.employment_status, e.job_level_id into v_status, v_level
    from public.employee e
    where e.id = new.employee_id and e.deleted_at is null;
    if v_status is distinct from 'active' then
      raise exception 'พนักงานที่ไม่ได้ทำงานอยู่ไม่มีสิทธิ์เบิกสวัสดิการ' using errcode = 'P0001';
    end if;

    select b.budget_type, b.is_active, b.max_claims into v_budget, v_active, v_max_claims
    from public.welfare_benefit b
    where b.id = new.benefit_id and b.deleted_at is null;
    if v_active is not true then
      raise exception 'สวัสดิการนี้ปิดการใช้งานแล้ว' using errcode = 'P0001';
    end if;

    -- ลำดับวงเงิน: รายคน > ตามระดับตำแหน่งของเจ้าของสิทธิ์ > วงเงินกลางของสวัสดิการ
    select l.id, l.amount into v_limit_id, v_limit
    from public.welfare_benefit_limit l
    where l.benefit_id = new.benefit_id
      and l.effective_from <= new.expense_date
      and (
        l.employee_id = new.employee_id
        or (l.employee_id is null and l.job_level_id = v_level)
        or (l.employee_id is null and l.job_level_id is null)
      )
    order by (l.employee_id is not null) desc, (l.job_level_id is not null) desc, l.effective_from desc
    limit 1;
    if v_limit_id is null then
      raise exception 'ยังไม่มีวงเงินที่มีผล ณ วันที่เกิดค่าใช้จ่าย' using errcode = 'P0001';
    end if;

    -- กันการยื่นพร้อมกันจนเกินวงเงิน จำนวนครั้ง หรือเพดานรวม (ล็อกรายพนักงานเพราะเพดานรวมข้ามสวัสดิการ)
    perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text, 0));

    -- จำนวนครั้งต่อปี นับคำขอที่ยังกันวงเงินอยู่ คำขอที่ถูกปฏิเสธหรือยกเลิกไม่นับ
    if v_max_claims is not null then
      select count(*) into v_claims
      from public.welfare_claim c
      where c.employee_id = new.employee_id
        and c.benefit_id = new.benefit_id
        and c.id <> new.id
        and c.deleted_at is null
        and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
        and extract(year from c.expense_date) = extract(year from new.expense_date);
      if v_claims >= v_max_claims then
        raise exception 'เบิกสวัสดิการนี้ครบ % ครั้งของปี % แล้ว', v_max_claims, extract(year from new.expense_date)::integer + 543
          using errcode = 'P0001';
      end if;
    end if;

    -- ยอดที่รอตรวจกันวงเงินไว้ทันที (รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้าที่สรุปแล้ว)
    select coalesce(sum(
      greatest(
        0,
        coalesce(c.amount_approved, c.amount_requested)
        + case when a.status = 'settled' and a.settlement = 'extra_payment' then coalesce(a.extra_amount_approved, 0) else 0 end
        - case when a.status = 'settled' and a.settlement = 'refund' then coalesce(a.refund_amount, 0) else 0 end
      )
    ), 0) into v_used
    from public.welfare_claim c
    left join public.welfare_claim_advance a on a.claim_id = c.id
    where c.employee_id = new.employee_id
      and c.benefit_id = new.benefit_id
      and c.id <> new.id
      and c.deleted_at is null
      and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
      and v_budget <> 'per_claim'
      and case when v_budget = 'monthly'
            then date_trunc('month', c.expense_date) = date_trunc('month', new.expense_date)
            else extract(year from c.expense_date) = extract(year from new.expense_date)
          end;
    if v_used + new.amount_requested > v_limit then
      raise exception 'ยอดเบิกเกินวงเงินคงเหลือ (วงเงิน %, ใช้ไปหรือรอตรวจ %, ขอเบิก %)', v_limit, v_used, new.amount_requested
        using errcode = 'P0001';
    end if;

    -- เพดานรวมต่อปีของพนักงาน (ทุกสวัสดิการ) ที่มีผล ณ วันที่เกิดค่าใช้จ่าย ไม่มีแถว หรือ amount เป็น null = ไม่จำกัด
    select true, t.amount into v_total_found, v_total
    from public.welfare_employee_total_limit t
    where t.employee_id = new.employee_id
      and t.effective_from <= new.expense_date
    order by t.effective_from desc
    limit 1;
    if v_total_found and v_total is not null then
      v_total_used := public.welfare_employee_year_usage(new.employee_id, extract(year from new.expense_date)::integer, new.id);
      if v_total_used + new.amount_requested > v_total then
        raise exception 'ยอดเบิกเกินวงเงินรวมต่อปีคงเหลือ (วงเงินรวม %, ใช้ไปหรือรอตรวจ %, ขอเบิก %)', v_total, v_total_used, new.amount_requested
          using errcode = 'P0001';
      end if;
    end if;

    if exists (
      select 1 from public.welfare_claim_receipt r
      where r.claim_id = new.id
        and (r.receipt_no is null or r.receipt_date is null or r.issuer_name is null or r.amount is null)
    ) then
      raise exception 'กรุณากรอกข้อมูลใบเสร็จให้ครบก่อนยื่นคำขอ' using errcode = 'P0001';
    end if;

    select r.receipt_no into v_duplicate
    from public.welfare_claim_receipt r
    join public.welfare_claim_receipt other
      on lower(btrim(other.issuer_name)) = lower(btrim(r.issuer_name))
     and lower(btrim(other.receipt_no)) = lower(btrim(r.receipt_no))
     and other.claim_id <> r.claim_id
    join public.welfare_claim oc on oc.id = other.claim_id
    where r.claim_id = new.id
      and oc.deleted_at is null
      and oc.status not in ('draft', 'rejected', 'cancelled')
    limit 1;
    if v_duplicate is not null then
      raise exception 'ใบเสร็จเลขที่ % ถูกใช้ยื่นเบิกแล้ว', v_duplicate using errcode = 'P0001';
    end if;

    new.benefit_limit_id := v_limit_id;
    new.submitted_at := coalesce(new.submitted_at, now());
  end if;

  return new;
end;
$$;
comment on function public.guard_welfare_claim() is 'ตรวจเส้นทางสถานะ และสิทธิ์ จำนวนครั้ง วงเงิน เพดานรวมต่อปี (รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้า) ใบเสร็จซ้ำ เมื่อยื่นคำขอ';
revoke execute on function public.guard_welfare_claim() from public, anon, authenticated;
