-- =============================================================================
-- ข้อเสนอสร้าง/แก้ไข/ปิดสวัสดิการ (รีดีไซน์ HR ข้อ 5, 6, 9 / ดีไซน์ H03, H04, H14, HH1, HH2, A07)
--   HR และ Admin แก้สวัสดิการตรงไม่ได้ ต้องเสนอ แล้วหัวหน้า HR อนุมัติ / ขอข้อมูลเพิ่ม / ไม่อนุมัติ
--
--   welfare_benefit.image_path        รูปประกอบสวัสดิการ (bucket welfare-benefit-images)
--   welfare_benefit_proposal          ข้อเสนอ 1 แถว เก็บค่าที่เสนอทั้งหมด (ฟอร์ม 4 ขั้น)
--   welfare_benefit_proposal_limit    วงเงินที่เสนอแยกตามระดับตำแหน่ง (job_level_id null = ทุกระดับ)
--   welfare_benefit_proposal_event    ประวัติข้อเสนอ เพิ่มได้อย่างเดียว (ยื่น แก้ ขอข้อมูลเพิ่ม อนุมัติ ...)
--
-- ยังไม่รวม: บทบาท HR_HEAD (ข้อ 9 ต้องแก้ auth แยก) และวงเงินตามระดับตำแหน่งของสวัสดิการที่ใช้งานจริง
--   ตอนนี้ welfare_benefit_limit มีวงเงินเดียวต่อสวัสดิการ ข้อเสนอจึงเก็บวงเงินรายระดับไว้ก่อน
--   การนำไปใช้จริงต้องตัดสินใจโครงสร้างวงเงินรายระดับอีกครั้ง
-- =============================================================================


-- -----------------------------------------------------------------------------
-- รูปประกอบสวัสดิการ
-- -----------------------------------------------------------------------------

alter table public.welfare_benefit add column image_path text;
comment on column public.welfare_benefit.image_path is 'path ของรูปประกอบใน bucket welfare-benefit-images (null = ใช้ไอคอนตามหมวด)';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('welfare-benefit-images', 'welfare-benefit-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- ชนิดข้อมูล
-- -----------------------------------------------------------------------------

create type public.welfare_proposal_kind as enum ('create', 'update', 'close');
comment on type public.welfare_proposal_kind is 'เสนอสร้างใหม่ / แก้ไข / ปิดสวัสดิการ';

create type public.welfare_proposal_status as enum ('draft', 'pending', 'needs_info', 'approved', 'rejected', 'withdrawn');
comment on type public.welfare_proposal_status is 'draft=ร่าง, pending=รอหัวหน้า HR, needs_info=ขอข้อมูลเพิ่ม, approved, rejected, withdrawn=ผู้เสนอถอน';

create sequence public.welfare_proposal_no_seq;


-- -----------------------------------------------------------------------------
-- ข้อเสนอ
-- -----------------------------------------------------------------------------

create table public.welfare_benefit_proposal (
  id                       uuid primary key default gen_random_uuid(),
  proposal_no              text not null unique
                           default ('P-' || (extract(year from (now() at time zone 'Asia/Bangkok'))::integer + 543)::text
                                    || '-' || lpad(nextval('public.welfare_proposal_no_seq')::text, 3, '0')),
  kind                     public.welfare_proposal_kind not null,
  status                   public.welfare_proposal_status not null default 'draft',
  benefit_id               uuid references public.welfare_benefit(id),

  -- ขั้น 1: ข้อมูลและรูปประกอบ
  name_th                  text,
  description              text,
  category                 text,
  image_path               text,
  form_type                text,
  effective_from           date,

  -- ขั้น 2: รอบวงเงินและจำนวนครั้ง (วงเงินรายระดับอยู่ใน welfare_benefit_proposal_limit)
  budget_type              public.welfare_budget_type,
  max_claims               integer check (max_claims is null or max_claims > 0),
  max_claims_note          text,

  -- ขั้น 3: ผู้มีสิทธิ์และเงื่อนไข
  eligibility              jsonb not null default '{}',
  allow_family             boolean not null default false,
  allow_advance            boolean not null default false,
  allow_insurance_excess   boolean not null default false,

  -- ขั้น 4: เอกสารที่ต้องแนบ
  required_documents       text[] not null default '{}',

  reason                   text,
  proposed_by              uuid not null references public.employee(id),
  proposer_role            text not null check (proposer_role in ('HR', 'SUPER_ADMIN')),
  submitted_at             timestamptz,
  decided_by               uuid references public.employee(id),
  decided_at               timestamptz,
  decision_note            text,
  applied_benefit_id       uuid references public.welfare_benefit(id),

  deleted_at               timestamptz,
  deleted_by               uuid,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  created_by               uuid,
  updated_by               uuid,

  check (jsonb_typeof(eligibility) = 'object'),
  -- สร้างใหม่ไม่มีสวัสดิการเดิม แก้ไข/ปิดต้องอ้างสวัสดิการเดิม
  check ((kind = 'create') = (benefit_id is null)),
  -- ยื่นแล้ว (ไม่ใช่ร่าง) ต้องมีเวลา และสร้าง/แก้ไขต้องมีชื่อกับรอบวงเงิน
  check (status = 'draft' or submitted_at is not null),
  check (status = 'draft' or kind = 'close' or (length(btrim(coalesce(name_th, ''))) > 0 and budget_type is not null)),
  -- เสนอปิดต้องมีเหตุผล
  check (kind <> 'close' or status = 'draft' or length(btrim(coalesce(reason, ''))) > 0),
  -- หัวหน้า HR ตัดสินแล้วต้องมีผู้ตัดสินและเวลา ขอข้อมูลเพิ่ม/ไม่อนุมัติต้องมีเหตุผล
  check (status not in ('approved', 'rejected', 'needs_info') or (decided_by is not null and decided_at is not null)),
  check (status not in ('rejected', 'needs_info') or length(btrim(coalesce(decision_note, ''))) > 0),
  -- ผู้เสนออนุมัติข้อเสนอของตัวเองไม่ได้
  check (decided_by is null or decided_by <> proposed_by),
  check (deleted_at is null or status = 'draft')
);
comment on table  public.welfare_benefit_proposal is 'ข้อเสนอสร้าง/แก้ไข/ปิดสวัสดิการ จาก HR หรือ Admin รอหัวหน้า HR อนุมัติ';
comment on column public.welfare_benefit_proposal.benefit_id is 'สวัสดิการเดิม (null เมื่อเสนอสร้างใหม่)';
comment on column public.welfare_benefit_proposal.eligibility is 'ผู้มีสิทธิ์ เช่น {"employment_types":["permanent"],"department_ids":[],"min_tenure_months":3}';
comment on column public.welfare_benefit_proposal.allow_family is 'เบิกให้ครอบครัวได้ (คู่สมรส บุตร บิดามารดา)';
comment on column public.welfare_benefit_proposal.allow_insurance_excess is 'เบิกส่วนเกินจากประกันได้';
comment on column public.welfare_benefit_proposal.required_documents is 'เอกสารที่ต้องแนบ เพิ่มและลบได้ทุกรายการ';
comment on column public.welfare_benefit_proposal.reason is 'เหตุผลที่เสนอ (บังคับเมื่อเสนอปิด)';
comment on column public.welfare_benefit_proposal.decision_note is 'ข้อความของหัวหน้า HR เมื่อขอข้อมูลเพิ่มหรือไม่อนุมัติ';
comment on column public.welfare_benefit_proposal.applied_benefit_id is 'สวัสดิการที่ถูกสร้าง/แก้หลังอนุมัติ';

create index welfare_benefit_proposal_status_idx on public.welfare_benefit_proposal (status, submitted_at) where deleted_at is null;
create index welfare_benefit_proposal_proposed_by_idx on public.welfare_benefit_proposal (proposed_by);
create index welfare_benefit_proposal_benefit_idx on public.welfare_benefit_proposal (benefit_id);
create index welfare_benefit_proposal_decided_by_idx on public.welfare_benefit_proposal (decided_by);
create index welfare_benefit_proposal_applied_idx on public.welfare_benefit_proposal (applied_benefit_id);

-- เสนอซ้ำไม่ได้: สวัสดิการเดียวกันมีข้อเสนอที่ยังเปิดอยู่ได้ทีละ 1 รายการ
create unique index welfare_benefit_proposal_open_uniq
  on public.welfare_benefit_proposal (benefit_id)
  where benefit_id is not null and status in ('pending', 'needs_info') and deleted_at is null;


-- -----------------------------------------------------------------------------
-- วงเงินที่เสนอตามระดับตำแหน่ง
-- -----------------------------------------------------------------------------

create table public.welfare_benefit_proposal_limit (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references public.welfare_benefit_proposal(id) on delete cascade,
  job_level_id  uuid references public.job_level(id),
  amount        numeric(12, 2) not null check (amount >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  unique nulls not distinct (proposal_id, job_level_id)
);
comment on table  public.welfare_benefit_proposal_limit is 'วงเงินที่เสนอ แยกตามระดับตำแหน่ง';
comment on column public.welfare_benefit_proposal_limit.job_level_id is 'ระดับตำแหน่ง (null = ใช้กับทุกระดับที่ไม่ได้กำหนดแยก)';

create index welfare_benefit_proposal_limit_level_idx on public.welfare_benefit_proposal_limit (job_level_id);


-- -----------------------------------------------------------------------------
-- ประวัติข้อเสนอ (เพิ่มได้อย่างเดียว)
-- -----------------------------------------------------------------------------

create table public.welfare_benefit_proposal_event (
  id                 bigint generated always as identity primary key,
  proposal_id        uuid not null references public.welfare_benefit_proposal(id),
  kind               text not null check (kind in ('submitted', 'revised', 'info_requested', 'approved', 'rejected', 'withdrawn')),
  actor_employee_id  uuid references public.employee(id),
  actor_role         text,
  note               text,
  snapshot           jsonb,
  created_at         timestamptz not null default now(),
  check (kind not in ('info_requested', 'rejected') or length(btrim(coalesce(note, ''))) > 0)
);
comment on table  public.welfare_benefit_proposal_event is 'ประวัติข้อเสนอสวัสดิการ ใครทำอะไร เมื่อไร พร้อมสำเนาค่าที่เสนอ ณ ตอนนั้น';
comment on column public.welfare_benefit_proposal_event.snapshot is 'ค่าที่เสนอ ณ ตอนนั้น ใช้เทียบว่าแก้อะไรหลังขอข้อมูลเพิ่ม';

create index welfare_benefit_proposal_event_proposal_idx on public.welfare_benefit_proposal_event (proposal_id, created_at);
create index welfare_benefit_proposal_event_actor_idx on public.welfare_benefit_proposal_event (actor_employee_id);


-- -----------------------------------------------------------------------------
-- trigger กลางและ RLS (service role เท่านั้น)
-- -----------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['welfare_benefit_proposal', 'welfare_benefit_proposal_limit'] loop
    execute format(
      'create trigger %I before insert or update on public.%I
         for each row execute function public.set_audit_columns()',
      t || '_set_audit_columns', t);
  end loop;
end;
$$;

create trigger welfare_benefit_proposal_prevent_hard_delete
  before delete on public.welfare_benefit_proposal
  for each row execute function public.prevent_hard_delete();

create trigger welfare_benefit_proposal_set_deleted_by
  before update of deleted_at on public.welfare_benefit_proposal
  for each row execute function public.set_deleted_by();

alter table public.welfare_benefit_proposal       enable row level security;
alter table public.welfare_benefit_proposal_limit enable row level security;
alter table public.welfare_benefit_proposal_event enable row level security;

revoke all on
  public.welfare_benefit_proposal, public.welfare_benefit_proposal_limit, public.welfare_benefit_proposal_event
from public, anon, authenticated;

revoke all on sequence public.welfare_proposal_no_seq from public, anon, authenticated;

revoke update, delete, truncate on public.welfare_benefit_proposal_event from service_role;
