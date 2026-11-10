-- =====================================================================
-- admin_issue_user_account: ออกบัญชีเข้าระบบให้พนักงานที่มีในตาราง employee แล้ว
-- สร้าง credential และบทบาทในธุรกรรมเดียว เพราะตารางเหล่านี้ลบแถวย้อนกลับไม่ได้
-- =====================================================================

create function public.admin_issue_user_account(
  p_employee_code text,
  p_login_name    text,
  p_password_hash text
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id     uuid;
  v_status public.employment_status;
begin
  select id, employment_status into v_id, v_status
  from public.employee
  where employee_code = p_employee_code and deleted_at is null
  for update;

  if v_id is null then
    raise exception 'ไม่พบพนักงาน' using errcode = 'P0001';
  end if;
  if v_status <> 'active' then
    raise exception 'ออกบัญชีได้เฉพาะพนักงานที่ยังทำงานอยู่' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.employee_credential c where c.employee_id = v_id) then
    raise exception 'พนักงานคนนี้มีบัญชีอยู่แล้ว' using errcode = 'P0001';
  end if;

  insert into public.employee_credential (employee_id, login_name, password_hash, must_change_password)
  values (v_id, btrim(p_login_name), p_password_hash, true);

  insert into public.user_role (employee_id, role_id)
  select v_id, r.id from public.app_role r
  where r.code = 'EMPLOYEE' and r.is_active
  on conflict do nothing;
end;
$fn$;

revoke all on function public.admin_issue_user_account(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_issue_user_account(text, text, text) to service_role;
