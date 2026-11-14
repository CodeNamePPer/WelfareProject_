-- =============================================================================
-- คำขอแก้ไขข้อมูลพนักงาน (รีดีไซน์ HR / ดีไซน์ H12 "คำขอแก้ไขข้อมูลพนักงาน", P01 "ส่งคำขอแก้ไขข้อมูล")
--
-- !! ยังไม่ได้ apply รอเจ้าของระบบอนุมัติ !!
--
-- พนักงาน (รวม HR ที่แก้ข้อมูลตัวเองไม่ได้) ขอแก้ข้อมูลส่วนตัว HR คนอื่นตรวจก่อนบันทึกจริง
--   employee_edit_request   คำขอ 1 แถว เก็บเฉพาะช่องที่ขอเปลี่ยน พร้อมค่าเดิมตอนยื่น
--
-- กติกา:
--   requested_fields = { "ชื่อคอลัมน์ของ employee": { "old": ค่าเดิม, "new": ค่าที่ขอ } } อย่างน้อย 1 ช่อง
--     (รูปแบบเดียวกับ audit_logs.changes เพื่อให้หน้า Log แสดงก่อน → หลังได้ทันที)
--   คอลัมน์ที่ขอแก้ได้ตรวจในแอป (โทรศัพท์ ที่อยู่ ผู้ติดต่อฉุกเฉิน ...) ช่องที่ระบบกำหนดขอแก้ไม่ได้
--   อนุมัติ = แอปบันทึกค่าใหม่ลง employee และเขียน audit_logs ใน transaction เดียวกับการเปลี่ยนสถานะ
--   ไม่อนุมัติต้องมีข้อความถึงพนักงาน (decision_note)
--   ผู้ตัดสินต้องไม่ใช่เจ้าของข้อมูล (HR อนุมัติคำขอของตัวเองไม่ได้)
--   พนักงาน 1 คนมีคำขอที่รอตรวจได้ครั้งละ 1 คำขอ
-- =============================================================================


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล
-- -----------------------------------------------------------------------------

create type public.employee_edit_request_status as enum ('pending', 'approved', 'rejected', 'cancelled');
comment on type public.employee_edit_request_status is 'pending=รอ HR ตรวจ, approved=อนุมัติและบันทึกแล้ว, rejected=ไม่อนุมัติ, cancelled=ผู้ขอยกเลิก';


-- -----------------------------------------------------------------------------
-- คำขอแก้ไขข้อมูล
-- -----------------------------------------------------------------------------

create table public.employee_edit_request (
  id                uuid primary key default gen_random_uuid(),
  employee_id       uuid not null references public.employee(id),
  requested_by      uuid not null references public.employee(id),
  status            public.employee_edit_request_status not null default 'pending',
  requested_fields  jsonb not null,
  reason            text not null check (length(btrim(reason)) > 0),
  submitted_at      timestamptz not null default now(),
  decided_by        uuid references public.employee(id),
  decided_at        timestamptz,
  decision_note     text,
  deleted_at        timestamptz,
  deleted_by        uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid,
  updated_by        uuid,

  check (jsonb_typeof(requested_fields) = 'object' and requested_fields <> '{}'::jsonb),
  -- ตัดสินแล้วต้องมีผู้ตัดสินและเวลา
  check (status not in ('approved', 'rejected') or (decided_by is not null and decided_at is not null)),
  -- ไม่อนุมัติต้องมีข้อความถึงพนักงาน
  check (status <> 'rejected' or length(btrim(coalesce(decision_note, ''))) > 0),
  -- เจ้าของข้อมูลตัดสินคำขอของตัวเองไม่ได้
  check (decided_by is null or decided_by <> employee_id)
);
comment on table  public.employee_edit_request is 'คำขอแก้ไขข้อมูลส่วนตัวของพนักงาน รอ HR ตรวจก่อนบันทึกลง employee';
comment on column public.employee_edit_request.employee_id is 'เจ้าของข้อมูลที่ขอแก้';
comment on column public.employee_edit_request.requested_by is 'ผู้ยื่นคำขอ (ปกติคือเจ้าของข้อมูลเอง)';
comment on column public.employee_edit_request.requested_fields is 'ช่องที่ขอเปลี่ยน เช่น {"phone":{"old":"08x-xxx-1100","new":"08x-xxx-2290"}}';
comment on column public.employee_edit_request.reason is 'เหตุผลจากพนักงาน';
comment on column public.employee_edit_request.decision_note is 'ข้อความถึงพนักงาน (บังคับเมื่อไม่อนุมัติ)';

-- พนักงาน 1 คนมีคำขอรอตรวจได้ครั้งละ 1 คำขอ
create unique index employee_edit_request_one_pending_idx
  on public.employee_edit_request (employee_id)
  where status = 'pending' and deleted_at is null;

create index employee_edit_request_status_idx on public.employee_edit_request (status, submitted_at desc);
create index employee_edit_request_decided_by_idx on public.employee_edit_request (decided_by);


-- -----------------------------------------------------------------------------
-- trigger กลางและ RLS (service role เท่านั้น เหมือนตารางอื่นของระบบ)
-- -----------------------------------------------------------------------------

create trigger employee_edit_request_set_audit_columns
  before insert or update on public.employee_edit_request
  for each row execute function public.set_audit_columns();

create trigger employee_edit_request_prevent_hard_delete
  before delete on public.employee_edit_request
  for each row execute function public.prevent_hard_delete();

create trigger employee_edit_request_set_deleted_by
  before update of deleted_at on public.employee_edit_request
  for each row execute function public.set_deleted_by();

alter table public.employee_edit_request enable row level security;

revoke all on public.employee_edit_request from public, anon, authenticated;
