-- =============================================================================
-- วงเงินตามระดับตำแหน่ง + รายละเอียดเต็มของสวัสดิการ (ฟอร์มเสนอสวัสดิการ H04 / HH2)
--
-- welfare_benefit_limit มี 3 ชนิด (คอลัมน์ไหนมีค่าบอกชนิด):
--   employee_id      มีค่า = วงเงินรายคน            (20261114130000)
--   job_level_id     มีค่า = วงเงินตามระดับตำแหน่ง   (ไฟล์นี้)
--   ทั้งคู่ว่าง          = วงเงินกลางของสวัสดิการ (ใช้กับคนที่ไม่มีระดับ หรือระดับที่ไม่ได้ตั้งวงเงิน)
--
-- เปลี่ยน logic ฐานข้อมูล 2 จุด (ส่วนอื่นเหมือนเดิมทุกบรรทัด):
--   1. v_welfare_benefit_current นับเฉพาะวงเงินกลาง (ไม่รวมแถวรายคนและแถวตามระดับ)
--   2. guard_welfare_claim() เลือกวงเงิน: รายคน > ตามระดับของเจ้าของสิทธิ์ > วงเงินกลาง
-- =============================================================================


-- -----------------------------------------------------------------------------
-- วงเงินตามระดับ
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit_limit
  add column job_level_id uuid references public.job_level(id);
comment on column public.welfare_benefit_limit.job_level_id is 'มีค่า = วงเงินของพนักงานระดับนี้ (ใช้แทนวงเงินกลาง)';

-- แถวหนึ่งเป็นได้ชนิดเดียว
alter table public.welfare_benefit_limit
  add constraint welfare_benefit_limit_one_scope_check check (employee_id is null or job_level_id is null);

alter table public.welfare_benefit_limit drop constraint welfare_benefit_limit_benefit_employee_from_key;
alter table public.welfare_benefit_limit
  add constraint welfare_benefit_limit_scope_from_key unique nulls not distinct (benefit_id, employee_id, job_level_id, effective_from);

create index welfare_benefit_limit_level_idx on public.welfare_benefit_limit (job_level_id, benefit_id, effective_from desc)
  where job_level_id is not null;


-- -----------------------------------------------------------------------------
-- รายละเอียดเต็ม (คำอธิบายสั้นบนการ์ดอยู่ใน description เดิม)
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit add column detail text;
comment on column public.welfare_benefit.detail is 'รายละเอียดเต็มของสวัสดิการ (description = คำอธิบายสั้นบนการ์ด)';

alter table public.welfare_benefit_proposal add column detail text;
comment on column public.welfare_benefit_proposal.detail is 'รายละเอียดเต็มที่เสนอ';


-- -----------------------------------------------------------------------------
-- วงเงินกลางที่ใช้วันนี้: ไม่นับแถวรายคนและแถวตามระดับ
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
  where l.benefit_id = b.id and l.employee_id is null and l.job_level_id is null and l.effective_from <= current_date
  order by l.effective_from desc
  limit 1
) cur on true
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.employee_id is null and l.job_level_id is null and l.effective_from > current_date
  order by l.effective_from
  limit 1
) nxt on true
where b.deleted_at is null;
comment on view public.v_welfare_benefit_current is 'สวัสดิการพร้อมวงเงินกลางที่ใช้วันนี้ และวงเงินกลางถัดไป (ไม่รวมวงเงินรายคนและวงเงินตามระดับ)';


-- -----------------------------------------------------------------------------
-- ตรวจตอนยื่นคำขอ
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

    -- กันการยื่นพร้อมกันจนเกินวงเงินหรือเกินจำนวนครั้ง
    perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || new.benefit_id::text, 0));

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

    -- ยอดที่รอตรวจกันวงเงินไว้ทันที
    select coalesce(sum(coalesce(c.amount_approved, c.amount_requested)), 0) into v_used
    from public.welfare_claim c
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
comment on function public.guard_welfare_claim() is 'ตรวจเส้นทางสถานะ และสิทธิ์ จำนวนครั้ง วงเงิน (รายคน > ตามระดับ > วงเงินกลาง) ใบเสร็จซ้ำ เมื่อยื่นคำขอ';

revoke execute on function public.guard_welfare_claim() from public, anon, authenticated;
