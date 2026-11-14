-- =============================================================================
-- วงเงินรายคน (รีดีไซน์ HR ข้อ 7 / ดีไซน์ H09 "สิทธิ์และวงเงินรายคน" + ปรับวงเงิน)
--
-- เก็บในตาราง welfare_benefit_limit เดิม เพิ่ม employee_id:
--   employee_id is null  = วงเงินกลางของสวัสดิการ (เหมือนเดิมทุกแถวที่มีอยู่)
--   employee_id มีค่า    = วงเงินเฉพาะพนักงานคนนั้น ใช้แทนวงเงินกลางตั้งแต่ effective_from
-- เหตุที่ไม่แยกตาราง: welfare_claim.benefit_limit_id อ้างแถวในตารางนี้อยู่แล้ว คำขอที่ใช้วงเงินรายคน
--   จึงอ้างวงเงินที่ใช้ตอนยื่นได้ทันที และหน้าที่อ่าน benefit_limit ของคำขออยู่แล้วไม่ต้องแก้
--
-- กติกา:
--   ปรับวงเงินรายคน = เพิ่มแถวใหม่ (แก้แถวที่มีผลแล้วไม่ได้ trigger เดิมบล็อกอยู่) และต้องมีเหตุผล
--   วงเงินรายคนที่มีผลแล้วใช้แทนวงเงินกลางเสมอ แม้วงเงินกลางจะปรับทีหลัง
--   ใครปรับ เมื่อไร บันทึกใน created_by/created_at ของแถว และแอปเขียน audit_logs ตอนบันทึก
--
-- เปลี่ยน logic ฐานข้อมูล 2 จุด:
--   1. v_welfare_benefit_current แสดงเฉพาะวงเงินกลาง (ไม่เช่นนั้นวงเงินรายคนจะกลายเป็นวงเงินของทุกคน)
--   2. guard_welfare_claim() เลือกวงเงินรายคนก่อนวงเงินกลางตอนยื่นคำขอ (ส่วนอื่นของฟังก์ชันเหมือนเดิมทุกบรรทัด)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- คอลัมน์และกติกา
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit_limit
  add column employee_id uuid references public.employee(id);
comment on column public.welfare_benefit_limit.employee_id is 'null = วงเงินกลางของสวัสดิการ, มีค่า = วงเงินรายคนของพนักงานคนนี้';

-- เดิม 1 สวัสดิการมีวงเงินได้ 1 แถวต่อวันที่มีผล ตอนนี้ต่อคนด้วย
alter table public.welfare_benefit_limit drop constraint welfare_benefit_limit_benefit_id_effective_from_key;
alter table public.welfare_benefit_limit
  add constraint welfare_benefit_limit_benefit_employee_from_key unique nulls not distinct (benefit_id, employee_id, effective_from);

-- ปรับวงเงินรายคนต้องมีเหตุผลเสมอ
alter table public.welfare_benefit_limit
  add constraint welfare_benefit_limit_employee_reason_check
  check (employee_id is null or length(btrim(coalesce(reason, ''))) > 0);

create index welfare_benefit_limit_employee_idx on public.welfare_benefit_limit (employee_id, benefit_id, effective_from desc)
  where employee_id is not null;


-- -----------------------------------------------------------------------------
-- วงเงินกลางที่ใช้วันนี้: ไม่นับแถววงเงินรายคน
-- -----------------------------------------------------------------------------

-- คอลัมน์ต้องเหมือนวิวเดิมทุกตัวและเรียงเหมือนเดิม (create or replace แทรกคอลัมน์ไม่ได้)
-- จึงระบุชื่อแทน b.* ซึ่งตอนนี้จะรวมคอลัมน์ที่เพิ่มทีหลัง (category, form_type, ...)
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
  where l.benefit_id = b.id and l.employee_id is null and l.effective_from <= current_date
  order by l.effective_from desc
  limit 1
) cur on true
left join lateral (
  select l.amount, l.effective_from
  from public.welfare_benefit_limit l
  where l.benefit_id = b.id and l.employee_id is null and l.effective_from > current_date
  order by l.effective_from
  limit 1
) nxt on true
where b.deleted_at is null;
comment on view public.v_welfare_benefit_current is 'สวัสดิการพร้อมวงเงินกลางที่ใช้วันนี้ และวงเงินกลางถัดไปที่ตั้งไว้ล่วงหน้า (ไม่รวมวงเงินรายคน)';


-- -----------------------------------------------------------------------------
-- วงเงินรายคนที่ใช้วันนี้ (1 แถวต่อพนักงานต่อสวัสดิการ)
-- -----------------------------------------------------------------------------

create view public.v_welfare_employee_limit_current
with (security_invoker = true) as
select distinct on (l.employee_id, l.benefit_id)
  l.id, l.employee_id, l.benefit_id, l.amount, l.effective_from, l.reason, l.created_by, l.created_at
from public.welfare_benefit_limit l
where l.employee_id is not null
  and l.effective_from <= (now() at time zone 'Asia/Bangkok')::date
order by l.employee_id, l.benefit_id, l.effective_from desc;
comment on view public.v_welfare_employee_limit_current is 'วงเงินรายคนที่มีผลวันนี้ ใช้แทนวงเงินกลางของสวัสดิการ';

revoke all on public.v_welfare_employee_limit_current from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- ตรวจตอนยื่นคำขอ: ใช้วงเงินรายคนก่อน
-- -----------------------------------------------------------------------------

create or replace function public.guard_welfare_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed      public.welfare_claim_status[];
  v_status     public.employment_status;
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

    select e.employment_status into v_status
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

    -- วงเงินรายคน (employee_id = เจ้าของสิทธิ์) มาก่อนวงเงินกลางของสวัสดิการ
    select l.id, l.amount into v_limit_id, v_limit
    from public.welfare_benefit_limit l
    where l.benefit_id = new.benefit_id
      and l.effective_from <= new.expense_date
      and (l.employee_id is null or l.employee_id = new.employee_id)
    order by (l.employee_id is not null) desc, l.effective_from desc
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
comment on function public.guard_welfare_claim() is 'ตรวจเส้นทางสถานะ และสิทธิ์ จำนวนครั้ง วงเงิน (รวมวงเงินรายคน) ใบเสร็จซ้ำ เมื่อยื่นคำขอ';

revoke execute on function public.guard_welfare_claim() from public, anon, authenticated;
