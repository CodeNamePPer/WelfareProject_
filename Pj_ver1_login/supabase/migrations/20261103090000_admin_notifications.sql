-- =============================================================================
-- admin_notifications: การแจ้งเตือนของ Admin (sidebar, แผงหน้าแรก, หน้าแจ้งเตือน)
--   - เขียน/อ่านจากฝั่งเซิร์ฟเวอร์ (service_role) ผ่าน src/lib/admin/alerts.ts
--   - "ต้องดำเนินการ" ใช้ร่วมกันทุก admin: คนหนึ่งกดตรวจสอบแล้ว (resolved_at) ถือว่าจบงาน
--   - "อ่านแล้ว" แยกต่อคน เก็บใน admin_notification_reads
-- =============================================================================

create table public.admin_notifications (
  id           bigint generated always as identity primary key,
  category     text not null check (category in ('access', 'security', 'system', 'welfare', 'expiring')),
  title        text not null,
  description  text not null default '',
  actionable   boolean not null default false,
  resolved_at  timestamptz,
  resolved_by  text,
  created_at   timestamptz not null default now()
);
comment on table  public.admin_notifications is 'การแจ้งเตือนของ Admin สร้างจากเหตุการณ์ในระบบ (ล็อกอินผิดซ้ำ, เปลี่ยนสิทธิ์ ฯลฯ)';
comment on column public.admin_notifications.actionable is 'true = ต้องมีคนตรวจสอบ จนกว่า resolved_at จะมีค่า';
comment on column public.admin_notifications.resolved_by is 'employee_id ของ admin ที่กดตรวจสอบ';

create index admin_notifications_created_at_idx on public.admin_notifications (created_at desc);

create table public.admin_notification_reads (
  notification_id  bigint not null references public.admin_notifications (id) on delete cascade,
  employee_id      text not null,
  read_at          timestamptz not null default now(),
  primary key (notification_id, employee_id)
);
comment on table  public.admin_notification_reads is 'admin แต่ละคนอ่านแจ้งเตือนรายการไหนแล้ว (ไม่มีแถว = ยังไม่อ่าน)';
comment on column public.admin_notification_reads.employee_id is 'employee_id ของ admin ที่อ่าน';

create index admin_notification_reads_employee_idx on public.admin_notification_reads (employee_id);

-- อ่าน/เขียนผ่าน service_role เท่านั้น (ไม่มี policy สำหรับ anon/authenticated)
alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;
revoke all on public.admin_notifications from public, anon, authenticated;
revoke all on public.admin_notification_reads from public, anon, authenticated;
-- แจ้งเตือนเป็นหลักฐานเหตุการณ์ ห้ามลบ (แก้ได้เฉพาะสถานะ resolved)
revoke delete, truncate on public.admin_notifications from service_role;
