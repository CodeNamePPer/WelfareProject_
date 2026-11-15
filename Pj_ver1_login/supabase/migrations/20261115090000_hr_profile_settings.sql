-- =============================================================================
-- ข้อมูลที่หน้าโปรไฟล์ของฉัน (ดีไซน์ P01, P02) ยังขาด — เพิ่มอย่างเดียว ไม่เปลี่ยน logic เดิม
--   employee.employment_type       ประเภทพนักงาน (ช่อง "ประเภทพนักงาน" ในข้อมูลที่ระบบกำหนด)
--   hr_notification_preference     ตั้งค่าการแจ้งเตือนรายเรื่อง (ในระบบ / อีเมล) แท็บ "การแจ้งเตือน"
-- =============================================================================

alter table public.employee
  add column employment_type text check (employment_type is null or employment_type in ('permanent', 'probation', 'contract', 'part_time'));
comment on column public.employee.employment_type is 'ประเภทพนักงาน: permanent=ประจำ, probation=ทดลองงาน, contract=สัญญาจ้าง, part_time=ไม่เต็มเวลา (null = ยังไม่ระบุ) HR เป็นผู้กำหนด';


create table public.hr_notification_preference (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employee(id),
  topic        text not null check (length(btrim(topic)) > 0),
  in_app       boolean not null default true,
  email        boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  unique (employee_id, topic)
);
comment on table  public.hr_notification_preference is 'การตั้งค่าการแจ้งเตือนของผู้ใช้ฝั่ง HR รายเรื่อง (ไม่มีแถว = แจ้งในระบบ ไม่ส่งอีเมล)';
comment on column public.hr_notification_preference.topic is 'เรื่องที่แจ้ง เช่น claim_new, claim_returned, proposal_decided, proposal_pending';

create trigger hr_notification_preference_set_audit_columns
  before insert or update on public.hr_notification_preference
  for each row execute function public.set_audit_columns();

create trigger hr_notification_preference_prevent_hard_delete
  before delete on public.hr_notification_preference
  for each row execute function public.prevent_hard_delete();

alter table public.hr_notification_preference enable row level security;

revoke all on public.hr_notification_preference from public, anon, authenticated;
