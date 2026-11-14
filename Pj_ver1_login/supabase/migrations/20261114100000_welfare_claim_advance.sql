-- =============================================================================
-- เบิกล่วงหน้าและการตรวจใบเสร็จ (รีดีไซน์ HR ข้อ 4 / ดีไซน์ H13, R07, F03, F09)
--   welfare_benefit.allow_advance   สวัสดิการไหนเบิกล่วงหน้าได้
--   welfare_claim_advance           ยอดล่วงหน้า กำหนดแนบใบเสร็จ และผลการตรวจใบเสร็จ (1 แถวต่อ 1 คำขอ)
--   v_welfare_advance_overdue       รายการที่เกินกำหนดแนบใบเสร็จ รอระบบยกเลิก
--
-- กติกา (สเปก HR ข้อ 4):
--   ใบเสร็จมากกว่ายอดล่วงหน้า  -> จ่ายเพิ่มได้ไม่เกินวงเงินคงเหลือ (settlement = extra_payment)
--   ใบเสร็จน้อยกว่ายอดล่วงหน้า -> ผู้ขอต้องคืนส่วนต่าง        (settlement = refund)
--   เกินกำหนดแนบใบเสร็จ        -> ยกเลิกรายการ ผู้ขอคืนยอดล่วงหน้าทั้งหมด (status = cancelled_overdue)
--
-- การตรวจ "จ่ายเพิ่มไม่เกินวงเงินคงเหลือ" ทำในแอปตอนบันทึก เพราะวงเงินคงเหลือคำนวณจาก v_welfare_claim_usage
-- ประวัติ (ใครตรวจ เมื่อไร เหตุผล) บันทึกลง welfare_claim_event เหมือนการตัดสินคำขอปกติ
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล
-- -----------------------------------------------------------------------------

create type public.welfare_advance_status as enum (
  'awaiting_receipt',   -- จ่ายล่วงหน้าแล้ว รอผู้ขอแนบใบเสร็จ
  'receipt_submitted',  -- แนบใบเสร็จแล้ว รอ HR ตรวจ
  'receipt_returned',   -- HR ส่งกลับให้แนบใหม่ (ยังต้องแนบภายในกำหนดเดิม)
  'settled',            -- HR ตรวจแล้ว สรุปยอดแล้ว
  'cancelled_overdue'   -- เกินกำหนดแนบ ระบบยกเลิก ผู้ขอต้องคืนยอดล่วงหน้า
);
comment on type public.welfare_advance_status is 'สถานะการเคลียร์เงินล่วงหน้า';

create type public.welfare_advance_settlement as enum ('extra_payment', 'refund', 'exact');
comment on type public.welfare_advance_settlement is 'ผลสรุปยอด: จ่ายเพิ่ม / ผู้ขอคืนส่วนต่าง / พอดี';

-- เหตุการณ์ใหม่ในประวัติคำขอ
alter type public.welfare_claim_event_kind add value if not exists 'receipt_submitted';
alter type public.welfare_claim_event_kind add value if not exists 'receipt_approved';
alter type public.welfare_claim_event_kind add value if not exists 'receipt_returned';
alter type public.welfare_claim_event_kind add value if not exists 'advance_cancelled';
alter type public.welfare_claim_event_kind add value if not exists 'refund_received';

-- ส่งกลับและยกเลิกต้องมีเหตุผลเสมอ (เทียบเป็นข้อความ เพราะค่า enum ใหม่ใช้ใน transaction เดียวกันไม่ได้)
alter table public.welfare_claim_event
  add constraint welfare_claim_event_advance_note_check
  check (kind::text not in ('receipt_returned', 'advance_cancelled') or length(btrim(coalesce(note, ''))) > 0);


-- -----------------------------------------------------------------------------
-- สวัสดิการที่เบิกล่วงหน้าได้
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit
  add column allow_advance        boolean not null default false,
  add column advance_receipt_days integer check (advance_receipt_days is null or advance_receipt_days > 0);
comment on column public.welfare_benefit.allow_advance is 'true = ยื่นเบิกล่วงหน้าได้ แล้วแนบใบเสร็จภายหลัง';
comment on column public.welfare_benefit.advance_receipt_days is 'ต้องแนบใบเสร็จภายในกี่วันหลังได้รับเงินล่วงหน้า (null = ใช้ค่ากลางของระบบ)';


-- -----------------------------------------------------------------------------
-- เงินล่วงหน้าของคำขอ
-- -----------------------------------------------------------------------------

create table public.welfare_claim_advance (
  id                     uuid primary key default gen_random_uuid(),
  claim_id               uuid not null unique references public.welfare_claim(id),
  advance_amount         numeric(12, 2) not null check (advance_amount > 0),
  advance_paid_at        timestamptz,
  receipt_due_date       date not null,
  status                 public.welfare_advance_status not null default 'awaiting_receipt',
  receipt_amount         numeric(12, 2) check (receipt_amount is null or receipt_amount > 0),
  receipt_submitted_at   timestamptz,
  settlement             public.welfare_advance_settlement,
  extra_amount_approved  numeric(12, 2) check (extra_amount_approved is null or extra_amount_approved >= 0),
  refund_amount          numeric(12, 2) check (refund_amount is null or refund_amount >= 0),
  refund_received_at     timestamptz,
  reviewed_by            uuid references public.employee(id),
  reviewed_at            timestamptz,
  review_note            text,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  created_by             uuid,
  updated_by             uuid,
  -- ส่งใบเสร็จแล้วต้องมียอดและเวลา
  check (status in ('awaiting_receipt', 'cancelled_overdue') or (receipt_amount is not null and receipt_submitted_at is not null)),
  -- สรุปยอดแล้วต้องมีผลสรุป ผู้ตรวจ และเวลา
  check (status <> 'settled' or (settlement is not null and reviewed_by is not null and reviewed_at is not null)),
  -- ผลสรุปต้องตรงกับยอด
  check (settlement is distinct from 'extra_payment' or (extra_amount_approved is not null and receipt_amount > advance_amount and extra_amount_approved <= receipt_amount - advance_amount)),
  check (settlement is distinct from 'refund' or refund_amount is not null),
  check (settlement is distinct from 'exact' or receipt_amount = advance_amount),
  -- ยกเลิกเพราะเกินกำหนด: คืนยอดล่วงหน้าทั้งหมด
  check (status <> 'cancelled_overdue' or (cancelled_at is not null and settlement = 'refund' and refund_amount = advance_amount))
);
comment on table  public.welfare_claim_advance is 'เงินเบิกล่วงหน้าของคำขอ และผลการตรวจใบเสร็จที่ตามมา';
comment on column public.welfare_claim_advance.advance_amount is 'ยอดที่จ่ายล่วงหน้า';
comment on column public.welfare_claim_advance.receipt_due_date is 'วันสุดท้ายที่ต้องแนบใบเสร็จ เกินแล้วยกเลิกรายการ';
comment on column public.welfare_claim_advance.receipt_amount is 'ยอดตามใบเสร็จที่ผู้ขอแนบ';
comment on column public.welfare_claim_advance.extra_amount_approved is 'ยอดจ่ายเพิ่มที่ HR อนุมัติ (ไม่เกินส่วนต่างและไม่เกินวงเงินคงเหลือ ตรวจในแอป)';
comment on column public.welfare_claim_advance.refund_amount is 'ยอดที่ผู้ขอต้องคืนบริษัท';
comment on column public.welfare_claim_advance.review_note is 'เหตุผลของ HR เมื่อปรับยอดหรือส่งกลับ';

create index welfare_claim_advance_status_idx on public.welfare_claim_advance (status, receipt_due_date);
create index welfare_claim_advance_reviewed_by_idx on public.welfare_claim_advance (reviewed_by);

-- รายการที่เกินกำหนดแนบใบเสร็จ (ใช้กับงานตั้งเวลา หรือหน้า HR/การเงิน)
create view public.v_welfare_advance_overdue
with (security_invoker = true) as
select a.*, c.claim_no, c.employee_id
from public.welfare_claim_advance a
join public.welfare_claim c on c.id = a.claim_id
where a.status in ('awaiting_receipt', 'receipt_returned')
  and a.receipt_due_date < (now() at time zone 'Asia/Bangkok')::date;
comment on view public.v_welfare_advance_overdue is 'เงินล่วงหน้าที่เกินกำหนดแนบใบเสร็จ รอยกเลิกและเรียกเงินคืน';


-- -----------------------------------------------------------------------------
-- trigger กลางและ RLS (service role เท่านั้น เหมือนตารางคำขออื่น)
-- -----------------------------------------------------------------------------

create trigger welfare_claim_advance_set_audit_columns
  before insert or update on public.welfare_claim_advance
  for each row execute function public.set_audit_columns();

create trigger welfare_claim_advance_prevent_hard_delete
  before delete on public.welfare_claim_advance
  for each row execute function public.prevent_hard_delete();

alter table public.welfare_claim_advance enable row level security;

revoke all on public.welfare_claim_advance, public.v_welfare_advance_overdue from public, anon, authenticated;
