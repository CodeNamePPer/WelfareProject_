-- =============================================================================
-- สถานะ "อ่านแล้ว" ของแจ้งเตือนฝั่งพนักงาน (/employee/notifications)
--   แจ้งเตือนสร้างจาก welfare_claim_event ของคำขอที่เป็นของพนักงาน จึงเก็บแค่ "อ่านถึงเวลาไหน" ต่อคน
--   เหตุการณ์หลัง seen_at ที่คนอื่นเป็นผู้ทำ = ยังไม่อ่าน · กด "อ่านทั้งหมดแล้ว" = เลื่อน seen_at เป็นตอนนี้
-- =============================================================================

create table public.employee_notification_seen (
  employee_id  uuid primary key references public.employee(id),
  seen_at      timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid
);
comment on table  public.employee_notification_seen is 'พนักงานอ่านแจ้งเตือนคำขอของตัวเองถึงเวลาไหน (ไม่มีแถว = ยังไม่เคยอ่าน)';
comment on column public.employee_notification_seen.seen_at is 'เหตุการณ์ของคำขอที่เกิดหลังเวลานี้ถือว่ายังไม่อ่าน';

create trigger employee_notification_seen_set_audit_columns
  before insert or update on public.employee_notification_seen
  for each row execute function public.set_audit_columns();

alter table public.employee_notification_seen enable row level security;

revoke all on public.employee_notification_seen from public, anon, authenticated;
