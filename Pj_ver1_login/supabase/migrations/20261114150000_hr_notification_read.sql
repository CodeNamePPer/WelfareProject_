-- =============================================================================
-- สถานะ "อ่านแล้ว" ของแจ้งเตือนฝั่ง HR (รีดีไซน์ HR / ดีไซน์ H07 แจ้งเตือน)
--
-- !! ยังไม่ได้ apply รอเจ้าของระบบอนุมัติ !!
--
-- แจ้งเตือนของ HR ไม่มีตารางของตัวเอง หน้า /hr/notifications สร้างรายการจากข้อมูลจริง
--   (คำขอรอตรวจ การเงินส่งกลับ ผลข้อเสนอสวัสดิการ ข้อเสนอรออนุมัติ) แต่ละรายการมี key คงที่
--   เช่น claim-new-<claim id>, claim-returned-<claim id>, proposal-approved-<proposal id>
-- ตารางนี้เก็บเฉพาะว่า "ใคร อ่าน key ไหน เมื่อไร" เพื่อให้จุดสีน้ำเงินและปุ่ม "อ่านทั้งหมดแล้ว" ทำงานได้
--
-- กติกา:
--   1 คนอ่าน 1 key ได้ 1 แถว (อ่านซ้ำไม่เพิ่มแถว)
--   ลบแถวไม่ได้ (prevent_hard_delete) รายการที่หายจากหน้าจอแล้วปล่อยแถวค้างไว้ได้ ไม่มีผลกับการแสดงผล
-- =============================================================================

create table public.hr_notification_read (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employee(id),
  notice_key    text not null check (length(btrim(notice_key)) > 0),
  read_at       timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  unique (employee_id, notice_key)
);
comment on table  public.hr_notification_read is 'แจ้งเตือนฝั่ง HR ที่ผู้ใช้อ่านแล้ว (รายการแจ้งเตือนสร้างจากข้อมูลจริง ไม่ได้เก็บในตาราง)';
comment on column public.hr_notification_read.employee_id is 'ผู้อ่าน';
comment on column public.hr_notification_read.notice_key is 'key ของแจ้งเตือน เช่น claim-new-<claim id> หรือ proposal-approved-<proposal id>';


-- -----------------------------------------------------------------------------
-- trigger กลางและ RLS (service role เท่านั้น เหมือนตารางอื่นของระบบ)
-- -----------------------------------------------------------------------------

create trigger hr_notification_read_set_audit_columns
  before insert or update on public.hr_notification_read
  for each row execute function public.set_audit_columns();

create trigger hr_notification_read_prevent_hard_delete
  before delete on public.hr_notification_read
  for each row execute function public.prevent_hard_delete();

alter table public.hr_notification_read enable row level security;

revoke all on public.hr_notification_read from public, anon, authenticated;
