-- =====================================================================
-- admin_create_user_account: ไม่ระบุรหัสพนักงาน (null/ว่าง) จะได้รหัสถัดไปอัตโนมัติ (E00019, ...)
-- คืนค่าเป็นรหัสพนักงานที่ได้ แทน uuid เดิม
-- =====================================================================

drop function if exists public.admin_create_user_account(text, text, text, text, text, text, date);

create function public.admin_create_user_account(
  p_employee_code text,
  p_login_name    text,
  p_name          text,
  p_role          text,
  p_password_hash text,
  p_email         text default null,
  p_hire_date     date default null
) returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_id      uuid;
  v_name    text := btrim(p_name, E' \t\r\n');
  v_first   text;
  v_last    text;
  v_login   text := btrim(p_login_name);
  v_code    text := nullif(upper(btrim(p_employee_code)), '');
  v_email   text;
  v_role_id uuid;
begin
  select id into v_role_id from public.app_role where code = upper(p_role) and is_active;
  if v_role_id is null then
    raise exception 'บทบาทไม่ถูกต้อง: %', p_role using errcode = 'P0001';
  end if;

  v_first := split_part(v_name, ' ', 1);
  if v_first = '' or v_login = '' then
    raise exception 'ชื่อ และชื่อล็อกอิน ห้ามว่าง' using errcode = 'P0001';
  end if;
  if v_code is not null and v_code !~ '^E[0-9]{5}$' then
    raise exception 'รหัสพนักงานต้องเป็นรูปแบบ E + เลข 5 หลัก เช่น E00019' using errcode = 'P0001';
  end if;
  v_code := coalesce(v_code, 'E' || lpad(nextval('public.employee_code_seq')::text, 5, '0'));
  v_last := coalesce(nullif(btrim(substr(v_name, length(v_first) + 1), E' \t\r\n'), ''), '-');

  v_email := coalesce(
    nullif(btrim(p_email), ''),
    case when v_login ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then v_login
         else lower(v_code) || '@no-email.invalid' end);

  insert into public.employee (employee_code, first_name_th, last_name_th, email, hire_date)
  values (v_code, v_first, v_last, v_email,
          coalesce(p_hire_date, (now() at time zone 'Asia/Bangkok')::date))
  returning id into v_id;

  insert into public.employee_credential (employee_id, login_name, password_hash)
  values (v_id, v_login, p_password_hash);

  insert into public.user_role (employee_id, role_id)
  select v_id, r.id from public.app_role r
  where r.is_active and (r.code = 'EMPLOYEE' or r.id = v_role_id);

  return v_code;
end;
$fn$;

revoke all on function public.admin_create_user_account(text, text, text, text, text, text, date) from public, anon, authenticated;
grant execute on function public.admin_create_user_account(text, text, text, text, text, text, date) to service_role;
