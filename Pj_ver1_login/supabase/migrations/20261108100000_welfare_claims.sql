-- =============================================================================
-- คำขอเบิกสวัสดิการ การจ่ายเงิน และรอบจ่าย (ตามเอกสาร "ร่างตารางคำขอเบิก" ฉบับที่ 2)
--   welfare_claim             คำขอเบิก 1 รายการ
--   welfare_claim_receipt     ใบเสร็จในคำขอ (คำขอเดียวมีได้หลายใบ)
--   welfare_claim_attachment  ข้อมูลไฟล์แนบ (ตัวไฟล์อยู่ใน bucket welfare-claim-docs)
--   welfare_claim_event       ประวัติการดำเนินการ เพิ่มได้อย่างเดียว
--   welfare_pay_round         รอบจ่ายรายเดือน
--   welfare_claim_payment     การโอนแต่ละครั้ง
--   employee_bank_account     บัญชีรับเงินของพนักงาน (เลขเต็มเข้ารหัส)
--
-- ทุกตารางอ่าน/เขียนผ่าน service role เท่านั้น สิทธิ์รายบทบาทตรวจในโค้ดฝั่ง server
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล
-- -----------------------------------------------------------------------------

create type public.welfare_claim_status as enum (
  'draft', 'pending_hr', 'needs_revision', 'pending_finance', 'finance_returned',
  'awaiting_payment', 'paid', 'rejected', 'cancelled'
);

create type public.welfare_claim_event_kind as enum (
  'submitted', 'resubmitted', 'revision_requested', 'hr_approved', 'finance_approved',
  'amount_adjusted', 'returned', 'rejected', 'cancelled', 'pay_date_changed',
  'paid', 'payment_failed', 'payment_reversed'
);

create type public.welfare_payment_status as enum ('preparing', 'transferred', 'failed', 'reversed');


-- -----------------------------------------------------------------------------
-- คอลัมน์เพิ่มในตารางเดิม
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit
  add column category        text,
  add column form_type       text,
  add column is_taxable      boolean not null default false,
  add column gl_account_code text;
comment on column public.welfare_benefit.category is 'หมวดสวัสดิการกลาง ใช้ร่วมกันทุกหน้า';
comment on column public.welfare_benefit.form_type is 'ชุดแบบฟอร์มยื่นเบิก เช่น รักษาพยาบาล ทันตกรรม อบรม วัคซีน';
comment on column public.welfare_benefit.is_taxable is 'ต้องคำนวณภาษีเมื่อจ่ายหรือไม่ (รอการเงินยืนยัน)';
comment on column public.welfare_benefit.gl_account_code is 'รหัสบัญชีสำหรับลงบัญชี (รอการเงินยืนยัน)';

alter table public.department add column cost_center_code text;
comment on column public.department.cost_center_code is 'ศูนย์ต้นทุนของหน่วยงาน (รอการเงินยืนยัน)';


-- -----------------------------------------------------------------------------
-- บัญชีรับเงินของพนักงาน
-- -----------------------------------------------------------------------------

create table public.employee_bank_account (
  id                    uuid primary key default gen_random_uuid(),
  employee_id           uuid not null references public.employee(id),
  bank_code             text not null,
  account_name          text not null,
  account_no_encrypted  bytea not null,
  account_no_masked     text not null,
  is_primary            boolean not null default true,
  deleted_at            timestamptz,
  deleted_by            uuid,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid,
  updated_by            uuid
);
comment on table  public.employee_bank_account is 'บัญชีรับเงินของพนักงาน แยกจาก employee เพื่อจำกัดสิทธิ์';
comment on column public.employee_bank_account.account_no_encrypted is 'เลขบัญชีเต็มที่เข้ารหัสแล้ว ใช้สร้างไฟล์โอนเท่านั้น';
comment on column public.employee_bank_account.account_no_masked is 'เลขแบบปิดบังสำหรับแสดงบนหน้าจอ เช่น xxx-xxx-7890';

create unique index employee_bank_account_primary_idx
  on public.employee_bank_account (employee_id) where is_primary and deleted_at is null;


-- -----------------------------------------------------------------------------
-- รอบจ่าย
-- -----------------------------------------------------------------------------

create table public.welfare_pay_round (
  id              uuid primary key default gen_random_uuid(),
  year            integer not null check (year between 2000 and 2200),
  month           integer not null check (month between 1 and 12),
  round_no        integer not null check (round_no in (1, 2)),
  pay_date        date not null,
  status          text not null default 'open' check (status in ('open', 'closed', 'paid')),
  item_count      integer check (item_count is null or item_count >= 0),
  total_amount    numeric(14, 2) check (total_amount is null or total_amount >= 0),
  closed_at       timestamptz,
  closed_by       uuid references public.employee(id),
  bank_file_name  text,
  reconciled_at   timestamptz,
  reconciled_by   uuid references public.employee(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  unique (year, month, round_no),
  check (status = 'open' or (closed_at is not null and item_count is not null and total_amount is not null))
);
comment on table  public.welfare_pay_round is 'รอบจ่ายรายเดือน รอบที่ 1 = ยื่นวันที่ 1–15, รอบที่ 2 = ยื่นวันที่ 16–สิ้นเดือน';
comment on column public.welfare_pay_round.total_amount is 'ยอดรวม ณ ตอนปิดรอบ ใช้กระทบยอดกับธนาคาร';

insert into public.system_setting (key, value, description) values
  ('pay_schedule', '{"round1PayDay": 25, "round1MonthOffset": 0, "round2PayDay": 10, "round2MonthOffset": 1}'::jsonb,
   'วันจ่ายของแต่ละรอบ และจำนวนเดือนนับจากเดือนที่ยื่น')
on conflict (key) do nothing;


-- -----------------------------------------------------------------------------
-- คำขอเบิก
-- -----------------------------------------------------------------------------

create sequence public.welfare_claim_no_seq;

create table public.welfare_claim (
  id                 uuid primary key default gen_random_uuid(),
  claim_no           text not null unique
                     default ('CLM-' || (extract(year from (now() at time zone 'Asia/Bangkok'))::integer + 543)::text
                              || '-' || lpad(nextval('public.welfare_claim_no_seq')::text, 4, '0'))
                     check (claim_no ~ '^CLM-[0-9]{4}-[0-9]{4,}$'),
  employee_id        uuid not null references public.employee(id),
  submitted_by       uuid not null references public.employee(id),
  benefit_id         uuid not null references public.welfare_benefit(id),
  benefit_limit_id   uuid references public.welfare_benefit_limit(id),
  status             public.welfare_claim_status not null default 'draft',
  amount_requested   numeric(12, 2) check (amount_requested is null or amount_requested > 0),
  amount_approved    numeric(12, 2) check (amount_approved is null or amount_approved >= 0),
  expense_date       date,
  budget_year        integer generated always as (extract(year from expense_date)::integer) stored,
  submitted_at       timestamptz,
  provider_name      text,
  note               text,
  details            jsonb not null default '{}',
  pay_round_id       uuid references public.welfare_pay_round(id),
  pay_date_override  date,
  approval_no        text,
  accounting_ref     text,
  import_batch_id    bigint references public.welfare_import_batch(id),
  deleted_at         timestamptz,
  deleted_by         uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid,
  updated_by         uuid,
  check (amount_approved is null or amount_requested is null or amount_approved <= amount_requested),
  check (status in ('draft', 'cancelled') or (amount_requested is not null and expense_date is not null and submitted_at is not null)),
  check (jsonb_typeof(details) = 'object'),
  check (deleted_at is null or status = 'draft')
);
comment on table  public.welfare_claim is 'คำขอเบิกสวัสดิการ 1 รายการต่อ 1 แถว';
comment on column public.welfare_claim.employee_id is 'พนักงานเจ้าของสิทธิ์';
comment on column public.welfare_claim.submitted_by is 'คนกรอกคำขอ ต่างจากเจ้าของเมื่อหัวหน้ายื่นแทน';
comment on column public.welfare_claim.benefit_limit_id is 'วงเงินที่ใช้อ้างอิงตอนยื่น ระบบกำหนดให้เมื่อยื่น';
comment on column public.welfare_claim.budget_year is 'ปีงบที่ใช้ตัดวงเงิน คำนวณจากวันที่เกิดค่าใช้จ่าย (ค.ศ.)';
comment on column public.welfare_claim.details is 'ช่องเฉพาะแต่ละสวัสดิการ อาจมีข้อมูลสุขภาพ ต้องจำกัดการแสดงผลตามบทบาท';
comment on column public.welfare_claim.pay_date_override is 'วันจ่ายที่การเงินเลื่อนเฉพาะรายการ ผู้เลื่อนและเหตุผลอยู่ใน welfare_claim_event';

create index welfare_claim_employee_year_idx on public.welfare_claim (employee_id, budget_year) where deleted_at is null;
create index welfare_claim_benefit_idx on public.welfare_claim (benefit_id);
create index welfare_claim_status_idx on public.welfare_claim (status, submitted_at) where deleted_at is null;
create index welfare_claim_pay_round_idx on public.welfare_claim (pay_round_id);
create index welfare_claim_submitted_by_idx on public.welfare_claim (submitted_by);
create index welfare_claim_import_batch_idx on public.welfare_claim (import_batch_id);


-- -----------------------------------------------------------------------------
-- เอกสารแนบ
-- -----------------------------------------------------------------------------

create table public.welfare_claim_attachment (
  id            uuid primary key default gen_random_uuid(),
  claim_id      uuid not null references public.welfare_claim(id),
  file_name     text not null,
  storage_path  text not null unique,
  mime_type     text not null,
  size_bytes    bigint not null check (size_bytes > 0),
  uploaded_by   uuid not null references public.employee(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
comment on table public.welfare_claim_attachment is 'ข้อมูลเอกสารแนบ ตัวไฟล์อยู่ใน bucket welfare-claim-docs';
create index welfare_claim_attachment_claim_idx on public.welfare_claim_attachment (claim_id) where deleted_at is null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('welfare-claim-docs', 'welfare-claim-docs', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- ใบเสร็จ
-- -----------------------------------------------------------------------------

create table public.welfare_claim_receipt (
  id               uuid primary key default gen_random_uuid(),
  claim_id         uuid not null references public.welfare_claim(id),
  receipt_no       text,
  receipt_date     date,
  issuer_name      text,
  amount           numeric(12, 2) check (amount is null or amount > 0),
  amount_approved  numeric(12, 2) check (amount_approved is null or amount_approved >= 0),
  attachment_id    uuid references public.welfare_claim_attachment(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid,
  updated_by       uuid,
  check (amount_approved is null or amount is null or amount_approved <= amount)
);
comment on table public.welfare_claim_receipt is 'ใบเสร็จแต่ละใบในคำขอ อนุมัติไม่เต็มเฉพาะบางใบได้';
create index welfare_claim_receipt_claim_idx on public.welfare_claim_receipt (claim_id);
create index welfare_claim_receipt_duplicate_idx on public.welfare_claim_receipt (lower(btrim(issuer_name)), lower(btrim(receipt_no)));
create index welfare_claim_receipt_attachment_idx on public.welfare_claim_receipt (attachment_id);


-- -----------------------------------------------------------------------------
-- ประวัติการดำเนินการ
-- -----------------------------------------------------------------------------

create table public.welfare_claim_event (
  id                 bigint generated always as identity primary key,
  claim_id           uuid not null references public.welfare_claim(id),
  kind               public.welfare_claim_event_kind not null,
  from_status        public.welfare_claim_status,
  to_status          public.welfare_claim_status,
  actor_employee_id  uuid references public.employee(id),
  actor_role         text,
  note               text,
  amount_before      numeric(12, 2),
  amount_after       numeric(12, 2),
  created_at         timestamptz not null default now(),
  check (
    kind not in ('revision_requested', 'returned', 'rejected', 'amount_adjusted', 'pay_date_changed')
    or length(btrim(coalesce(note, ''))) > 0
  )
);
comment on table  public.welfare_claim_event is 'ประวัติการดำเนินการของคำขอ เพิ่มได้อย่างเดียว';
comment on column public.welfare_claim_event.actor_employee_id is 'ผู้ดำเนินการ ว่างเมื่อเป็นระบบ';
comment on column public.welfare_claim_event.actor_role is 'บทบาทขณะดำเนินการ เพราะบทบาทเปลี่ยนภายหลังได้';
create index welfare_claim_event_claim_idx on public.welfare_claim_event (claim_id, id);
create index welfare_claim_event_actor_idx on public.welfare_claim_event (actor_employee_id);


-- -----------------------------------------------------------------------------
-- การโอนเงิน
-- -----------------------------------------------------------------------------

create table public.welfare_claim_payment (
  id                 uuid primary key default gen_random_uuid(),
  claim_id           uuid not null references public.welfare_claim(id),
  pay_round_id       uuid not null references public.welfare_pay_round(id),
  bank_account_id    uuid references public.employee_bank_account(id),
  bank_code          text not null,
  account_no_masked  text not null,
  amount_gross       numeric(12, 2) not null check (amount_gross > 0),
  tax_withheld       numeric(12, 2) not null default 0 check (tax_withheld >= 0),
  amount_net         numeric(12, 2) not null check (amount_net >= 0),
  status             public.welfare_payment_status not null default 'preparing',
  transfer_ref       text,
  prepared_by        uuid not null references public.employee(id),
  confirmed_by       uuid references public.employee(id),
  paid_at            timestamptz,
  failure_reason     text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid,
  updated_by         uuid,
  check (amount_net = amount_gross - tax_withheld),
  check (confirmed_by is null or confirmed_by <> prepared_by),
  check (status <> 'transferred' or (transfer_ref is not null and paid_at is not null)),
  check (status not in ('failed', 'reversed') or length(btrim(coalesce(failure_reason, ''))) > 0)
);
comment on table  public.welfare_claim_payment is 'การโอนแต่ละครั้ง คำขอเดียวมีได้หลายแถวเมื่อโอนไม่สำเร็จหรือกลับรายการ';
comment on column public.welfare_claim_payment.tax_withheld is 'ภาษีหัก ณ ที่จ่าย (รอการเงินยืนยัน)';
comment on column public.welfare_claim_payment.paid_at is 'เวลาที่จ่ายจริง แยกจากกำหนดจ่าย';

create unique index welfare_claim_payment_transferred_idx on public.welfare_claim_payment (claim_id) where status = 'transferred';
create index welfare_claim_payment_claim_idx on public.welfare_claim_payment (claim_id);
create index welfare_claim_payment_round_idx on public.welfare_claim_payment (pay_round_id);
create index welfare_claim_payment_bank_account_idx on public.welfare_claim_payment (bank_account_id);


-- -----------------------------------------------------------------------------
-- ยอดใช้ไปต่อคน ต่อสวัสดิการ ต่อปี
-- -----------------------------------------------------------------------------

create view public.v_welfare_claim_usage
with (security_invoker = true) as
select
  c.employee_id,
  c.benefit_id,
  c.budget_year,
  coalesce(sum(coalesce(c.amount_approved, c.amount_requested)) filter (where c.status in ('awaiting_payment', 'paid')), 0) as approved_amount,
  coalesce(sum(c.amount_requested) filter (where c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned')), 0) as pending_amount,
  count(*) as claim_count
from public.welfare_claim c
where c.deleted_at is null
  and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
group by c.employee_id, c.benefit_id, c.budget_year;
comment on view public.v_welfare_claim_usage is 'ยอดอนุมัติแล้ว ยอดที่รอตรวจ และจำนวนครั้งที่เบิก';


-- -----------------------------------------------------------------------------
-- กฎของคำขอ: เส้นทางสถานะ และการตรวจตอนยื่น
-- -----------------------------------------------------------------------------

create function public.guard_welfare_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed     public.welfare_claim_status[];
  v_status    public.employment_status;
  v_budget    public.welfare_budget_type;
  v_active    boolean;
  v_limit_id  uuid;
  v_limit     numeric;
  v_used      numeric;
  v_duplicate text;
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

    select b.budget_type, b.is_active into v_budget, v_active
    from public.welfare_benefit b
    where b.id = new.benefit_id and b.deleted_at is null;
    if v_active is not true then
      raise exception 'สวัสดิการนี้ปิดการใช้งานแล้ว' using errcode = 'P0001';
    end if;

    select l.id, l.amount into v_limit_id, v_limit
    from public.welfare_benefit_limit l
    where l.benefit_id = new.benefit_id and l.effective_from <= new.expense_date
    order by l.effective_from desc
    limit 1;
    if v_limit_id is null then
      raise exception 'ยังไม่มีวงเงินที่มีผล ณ วันที่เกิดค่าใช้จ่าย' using errcode = 'P0001';
    end if;

    -- กันการยื่นพร้อมกันจนเกินวงเงิน
    perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || new.benefit_id::text, 0));

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
comment on function public.guard_welfare_claim() is 'ตรวจเส้นทางสถานะ และสิทธิ์ วงเงิน ใบเสร็จซ้ำ เมื่อยื่นคำขอ';

create trigger welfare_claim_guard
  before insert or update on public.welfare_claim
  for each row execute function public.guard_welfare_claim();


-- รอบที่ปิดแล้วเพิ่มรายการไม่ได้ และย้ายออกได้เฉพาะรายการที่โอนไม่สำเร็จหรือกลับรายการ
create function public.guard_welfare_claim_pay_round()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_round_status text;
begin
  if new.import_batch_id is not null then
    return new;
  end if;

  if tg_op = 'UPDATE' and new.pay_round_id is not distinct from old.pay_round_id then
    return new;
  end if;

  if new.pay_round_id is not null then
    select r.status into v_round_status from public.welfare_pay_round r where r.id = new.pay_round_id;
    if v_round_status <> 'open' then
      raise exception 'รอบจ่ายนี้ปิดแล้ว เพิ่มรายการไม่ได้' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.pay_round_id is not null then
    select r.status into v_round_status from public.welfare_pay_round r where r.id = old.pay_round_id;
    if v_round_status <> 'open' and not exists (
      select 1 from public.welfare_claim_payment p
      where p.claim_id = new.id and p.pay_round_id = old.pay_round_id and p.status in ('failed', 'reversed')
    ) then
      raise exception 'รอบจ่ายนี้ปิดแล้ว ย้ายรายการออกไม่ได้' using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

create trigger welfare_claim_guard_pay_round
  before insert or update of pay_round_id on public.welfare_claim
  for each row execute function public.guard_welfare_claim_pay_round();


-- ผู้อนุมัติต้องระบุตัวได้ และต้องไม่ใช่เจ้าของคำขอ
create function public.guard_welfare_claim_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if new.kind in ('revision_requested', 'hr_approved', 'finance_approved', 'amount_adjusted', 'returned', 'rejected') then
    select c.employee_id into v_owner from public.welfare_claim c where c.id = new.claim_id;
    if new.actor_employee_id is null then
      raise exception 'การอนุมัติหรือปฏิเสธต้องระบุผู้ดำเนินการ' using errcode = 'P0001';
    end if;
    if new.actor_employee_id = v_owner then
      raise exception 'ผู้อนุมัติต้องไม่ใช่เจ้าของคำขอ' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

create trigger welfare_claim_event_guard
  before insert on public.welfare_claim_event
  for each row execute function public.guard_welfare_claim_event();

revoke execute on function public.guard_welfare_claim() from public, anon, authenticated;
revoke execute on function public.guard_welfare_claim_pay_round() from public, anon, authenticated;
revoke execute on function public.guard_welfare_claim_event() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- trigger กลาง
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['employee_bank_account', 'welfare_pay_round', 'welfare_claim', 'welfare_claim_receipt', 'welfare_claim_payment'] loop
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()',
      t || '_set_audit_columns', t);
  end loop;

  foreach t in array array['employee_bank_account', 'welfare_pay_round', 'welfare_claim', 'welfare_claim_attachment', 'welfare_claim_payment'] loop
    execute format(
      'create trigger %I before delete on public.%I
         for each row execute function public.prevent_hard_delete()',
      t || '_prevent_hard_delete', t);
  end loop;

  foreach t in array array['employee_bank_account', 'welfare_claim'] loop
    execute format(
      'create trigger %I before update of deleted_at on public.%I
         for each row execute function public.set_deleted_by()',
      t || '_set_deleted_by', t);
  end loop;
end;
$$;


-- -----------------------------------------------------------------------------
-- RLS: service role เท่านั้น เหมือน employee_credential และ welfare_import_batch
-- -----------------------------------------------------------------------------

alter table public.employee_bank_account    enable row level security;
alter table public.welfare_pay_round        enable row level security;
alter table public.welfare_claim            enable row level security;
alter table public.welfare_claim_attachment enable row level security;
alter table public.welfare_claim_receipt    enable row level security;
alter table public.welfare_claim_event      enable row level security;
alter table public.welfare_claim_payment    enable row level security;

revoke all on
  public.employee_bank_account, public.welfare_pay_round, public.welfare_claim,
  public.welfare_claim_attachment, public.welfare_claim_receipt, public.welfare_claim_event,
  public.welfare_claim_payment, public.v_welfare_claim_usage
from public, anon, authenticated;

revoke all on sequence public.welfare_claim_no_seq from public, anon, authenticated;

-- ประวัติเพิ่มได้อย่างเดียว
revoke update, delete, truncate on public.welfare_claim_event from service_role;
