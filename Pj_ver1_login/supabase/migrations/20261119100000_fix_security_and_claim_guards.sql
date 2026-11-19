-- =============================================================================
-- แก้ไขปัญหาความปลอดภัยและกฎการเบิกสวัสดิการ:
--   1. คืน security_invoker = true และ schema prefix ให้ public.v_app_user
--   2. เพิกถอน session ใน employee_credential ทันทีเมื่อเปลี่ยนสถานะหรือบทบาทใน admin_update_user_account
--   3. อนุญาตให้ปรับวงเงินที่มีผลวันนี้ (Asia/Bangkok) ได้ถ้ายังไม่มีคำขออ้างอิงใน guard_welfare_limit_update
--   4. นับยอดจ่ายเพิ่ม (extra_amount_approved) และหักยอดคืน (refund_amount) ใน v_welfare_claim_usage และ guard_welfare_claim
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) public.v_app_user (security_invoker = true + public.* schema prefix)
-- -----------------------------------------------------------------------------

create or replace view public.v_app_user
with (security_invoker = true) as
select
  e.id                                         as employee_uuid,
  e.employee_code                              as employee_id,
  c.login_name                                 as email,
  lower(c.login_name)                          as login_key,
  lower(e.employee_code)                       as code_key,
  btrim(e.first_name_th
        || case when e.last_name_th = '-' then '' else ' ' || e.last_name_th end) as name,
  coalesce((
    select r.code
    from public.user_role ur
    join public.app_role r on r.id = ur.role_id and r.is_active
    where ur.employee_id = e.id and ur.revoked_at is null
    order by case r.code when 'SUPER_ADMIN' then 1 when 'HR' then 2 when 'FINANCE' then 3 else 4 end
    limit 1
  ), 'EMPLOYEE')                               as role,
  upper(e.employment_status::text)             as status,
  c.last_login_at,
  greatest(e.updated_at, c.updated_at)         as updated_at,
  e.title_th,
  e.first_name_th,
  nullif(e.last_name_th, '-')                  as last_name_th,
  e.first_name_en,
  e.last_name_en,
  e.nickname,
  e.email                                      as contact_email,
  e.phone,
  e.emergency_contact_name,
  e.emergency_contact_phone,
  e.address_line,
  e.subdistrict,
  e.district,
  e.province,
  e.postal_code,
  d.name_th                                    as department_name,
  p.name_th                                    as position_name,
  jl.name_th                                   as job_level_name,
  m.employee_code                              as manager_code,
  btrim(m.first_name_th
        || case when m.last_name_th = '-' then '' else ' ' || m.last_name_th end) as manager_name,
  e.hire_date,
  e.resigned_date,
  e.deceased_date,
  e.status_reason,
  e.photo_url
from public.employee e
join public.employee_credential c on c.employee_id = e.id
left join public.department d on d.id = e.department_id
left join public.position p   on p.id = e.position_id
left join public.job_level jl on jl.id = e.job_level_id
left join public.employee m   on m.id = e.manager_employee_id and m.deleted_at is null
where e.deleted_at is null;

comment on view public.v_app_user is
  'มุมมองบัญชีผู้ใช้สำหรับแอป (อ่านอย่างเดียว) email = ชื่อล็อกอิน, contact_email = อีเมลติดต่อ, role = บทบาทสูงสุดที่ยังใช้งาน';
revoke all on public.v_app_user from public, anon, authenticated;
grant select on public.v_app_user to service_role;


-- -----------------------------------------------------------------------------
-- 2) admin_update_user_account: ยกเลิก session เมื่อเปลี่ยนบทบาทหรือสถานะ
-- -----------------------------------------------------------------------------

create or replace function public.admin_update_user_account(
  p_employee_code text,
  p_name          text default null,
  p_login_name    text default null,
  p_role          text default null,
  p_status        text default null,   -- 'ACTIVE' | 'RESIGNED'
  p_reason        text default null
) returns void
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_emp        public.employee%rowtype;
  v_name       text;
  v_first      text;
  v_last       text;
  v_login      text;
  v_role_id    uuid;
  v_new_status public.employment_status;
  v_revoke     boolean := false;
begin
  select * into v_emp
  from public.employee
  where employee_code = p_employee_code and deleted_at is null
  for update;
  if not found then
    raise exception 'ไม่พบผู้ใช้งาน' using errcode = 'P0002';
  end if;

  if p_name is not null then
    v_name  := btrim(p_name, E' \t\r\n');
    v_first := split_part(v_name, ' ', 1);
    if v_first = '' then
      raise exception 'ชื่อห้ามว่าง' using errcode = 'P0001';
    end if;
    v_last := coalesce(nullif(btrim(substr(v_name, length(v_first) + 1), E' \t\r\n'), ''), '-');
    update public.employee set first_name_th = v_first, last_name_th = v_last where id = v_emp.id;
  end if;

  if p_login_name is not null then
    v_login := btrim(p_login_name);
    if v_login = '' then
      raise exception 'ชื่อล็อกอิน/อีเมลห้ามว่าง' using errcode = 'P0001';
    end if;
    update public.employee_credential set login_name = v_login where employee_id = v_emp.id;
    if v_login ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      update public.employee set email = v_login where id = v_emp.id;
    end if;
  end if;

  if p_status is not null then
    if v_emp.employment_status = 'deceased' then
      raise exception 'พนักงานที่เสียชีวิตเปลี่ยนสถานะจากหน้านี้ไม่ได้' using errcode = 'P0001';
    end if;
    v_new_status := (case upper(p_status)
                       when 'ACTIVE'   then 'active'
                       when 'RESIGNED' then 'resigned'
                     end)::public.employment_status;
    if v_new_status is null then
      raise exception 'สถานะไม่ถูกต้อง: %', p_status using errcode = 'P0001';
    end if;
    if v_new_status <> v_emp.employment_status then
      update public.employee
         set employment_status = v_new_status,
             resigned_date = case when v_new_status = 'resigned'
                                  then greatest(hire_date, (now() at time zone 'Asia/Bangkok')::date) end,
             status_reason = p_reason
       where id = v_emp.id;
      v_revoke := true;
    end if;
  end if;

  if p_role is not null then
    select id into v_role_id from public.app_role where code = upper(p_role) and is_active;
    if v_role_id is null then
      raise exception 'บทบาทไม่ถูกต้อง: %', p_role using errcode = 'P0001';
    end if;

    if exists (
      select 1 from public.user_role ur
      join public.app_role r on r.id = ur.role_id
      where ur.employee_id = v_emp.id
        and ur.revoked_at is null
        and r.code in ('HR', 'FINANCE', 'SUPER_ADMIN')
        and r.id <> v_role_id
    ) or not exists (
      select 1 from public.user_role x
      where x.employee_id = v_emp.id and x.role_id = v_role_id and x.revoked_at is null
    ) then
      v_revoke := true;
    end if;

    update public.user_role as ur
       set revoked_at = now()
      from public.app_role r
     where ur.role_id = r.id
       and ur.employee_id = v_emp.id
       and ur.revoked_at is null
       and r.code in ('HR', 'FINANCE', 'SUPER_ADMIN')
       and r.id <> v_role_id;

    insert into public.user_role (employee_id, role_id)
    select v_emp.id, r.id
    from public.app_role r
    where r.is_active
      and (r.id = v_role_id or r.code = 'EMPLOYEE')
      and not exists (
        select 1 from public.user_role x
        where x.employee_id = v_emp.id and x.role_id = r.id and x.revoked_at is null
      );
  end if;

  if v_revoke then
    update public.employee_credential
       set sessions_revoked_at = now()
     where employee_id = v_emp.id;
  end if;

  update public.employee set updated_at = now() where id = v_emp.id;
end;
$fn$;

revoke all on function public.admin_update_user_account(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_update_user_account(text, text, text, text, text, text) to service_role;


-- -----------------------------------------------------------------------------
-- 3) guard_welfare_limit_update: แก้วงเงินวันนี้ได้เมื่อยังไม่มีคำขออ้างอิง
-- -----------------------------------------------------------------------------

create or replace function public.guard_welfare_limit_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_today date := (now() at time zone 'Asia/Bangkok')::date;
begin
  if old.effective_from < v_today then
    raise exception 'วงเงินที่มีผลแล้วแก้ไขไม่ได้ ให้เพิ่มวงเงินใหม่พร้อมวันที่มีผลแทน'
      using errcode = 'P0001';
  end if;
  if old.effective_from = v_today and exists (
    select 1 from public.welfare_claim c
    where c.benefit_limit_id = old.id and c.deleted_at is null
  ) then
    raise exception 'วงเงินที่มีผลวันนี้มีคำขอเบิกใช้อยู่แล้ว ให้เพิ่มวงเงินใหม่พร้อมวันที่มีผลแทน'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
comment on function public.guard_welfare_limit_update() is 'บล็อกการแก้วงเงินที่เริ่มใช้ก่อนวันนี้ หรือมีคำขออ้างอิงแล้ว (วันที่ตามเวลาไทย)';
revoke execute on function public.guard_welfare_limit_update() from public, anon, authenticated;


-- -----------------------------------------------------------------------------
-- 4) v_welfare_claim_usage และ guard_welfare_claim: รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้า
-- -----------------------------------------------------------------------------

create or replace view public.v_welfare_claim_usage
with (security_invoker = true) as
select
  c.employee_id,
  c.benefit_id,
  c.budget_year,
  coalesce(sum(
    greatest(
      0,
      coalesce(c.amount_approved, c.amount_requested)
      + case when a.status = 'settled' and a.settlement = 'extra_payment' then coalesce(a.extra_amount_approved, 0) else 0 end
      - case when a.status = 'settled' and a.settlement = 'refund' then coalesce(a.refund_amount, 0) else 0 end
    )
  ) filter (where c.status in ('awaiting_payment', 'paid')), 0) as approved_amount,
  coalesce(sum(c.amount_requested) filter (where c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned')), 0) as pending_amount,
  count(*) as claim_count
from public.welfare_claim c
left join public.welfare_claim_advance a on a.claim_id = c.id
where c.deleted_at is null
  and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
group by c.employee_id, c.benefit_id, c.budget_year;
comment on view public.v_welfare_claim_usage is 'ยอดอนุมัติแล้ว (รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้า) ยอดที่รอตรวจ และจำนวนครั้งที่เบิก';
revoke all on public.v_welfare_claim_usage from public, anon, authenticated;
grant select on public.v_welfare_claim_usage to service_role;

create or replace function public.guard_welfare_claim()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed      public.welfare_claim_status[];
  v_status     public.employment_status;
  v_level      uuid;
  v_budget     public.welfare_budget_type;
  v_active     boolean;
  v_max_claims integer;
  v_claims     integer;
  v_limit_id   uuid;
  v_limit      numeric;
  v_used       numeric;
  v_duplicate  text;
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

    select e.employment_status, e.job_level_id into v_status, v_level
    from public.employee e
    where e.id = new.employee_id and e.deleted_at is null;
    if v_status is distinct from 'active' then
      raise exception 'พนักงานที่ไม่ได้ทำงานอยู่ไม่มีสิทธิ์เบิกสวัสดิการ' using errcode = 'P0001';
    end if;

    select b.budget_type, b.is_active, b.max_claims into v_budget, v_active, v_max_claims
    from public.welfare_benefit b
    where b.id = new.benefit_id and b.deleted_at is null;
    if v_active is not true then
      raise exception 'สวัสดิการนี้ปิดการใช้งานแล้ว' using errcode = 'P0001';
    end if;

    -- ลำดับวงเงิน: รายคน > ตามระดับตำแหน่งของเจ้าของสิทธิ์ > วงเงินกลางของสวัสดิการ
    select l.id, l.amount into v_limit_id, v_limit
    from public.welfare_benefit_limit l
    where l.benefit_id = new.benefit_id
      and l.effective_from <= new.expense_date
      and (
        l.employee_id = new.employee_id
        or (l.employee_id is null and l.job_level_id = v_level)
        or (l.employee_id is null and l.job_level_id is null)
      )
    order by (l.employee_id is not null) desc, (l.job_level_id is not null) desc, l.effective_from desc
    limit 1;
    if v_limit_id is null then
      raise exception 'ยังไม่มีวงเงินที่มีผล ณ วันที่เกิดค่าใช้จ่าย' using errcode = 'P0001';
    end if;

    -- กันการยื่นพร้อมกันจนเกินวงเงินหรือเกินจำนวนครั้ง
    perform pg_advisory_xact_lock(hashtextextended(new.employee_id::text || new.benefit_id::text, 0));

    -- จำนวนครั้งต่อปี นับคำขอที่ยังกันวงเงินอยู่ คำขอที่ถูกปฏิเสธหรือยกเลิกไม่นับ
    if v_max_claims is not null then
      select count(*) into v_claims
      from public.welfare_claim c
      where c.employee_id = new.employee_id
        and c.benefit_id = new.benefit_id
        and c.id <> new.id
        and c.deleted_at is null
        and c.status in ('pending_hr', 'needs_revision', 'pending_finance', 'finance_returned', 'awaiting_payment', 'paid')
        and extract(year from c.expense_date) = extract(year from new.expense_date);
      if v_claims >= v_max_claims then
        raise exception 'เบิกสวัสดิการนี้ครบ % ครั้งของปี % แล้ว', v_max_claims, extract(year from new.expense_date)::integer + 543
          using errcode = 'P0001';
      end if;
    end if;

    -- ยอดที่รอตรวจกันวงเงินไว้ทันที (รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้าที่สรุปแล้ว)
    select coalesce(sum(
      greatest(
        0,
        coalesce(c.amount_approved, c.amount_requested)
        + case when a.status = 'settled' and a.settlement = 'extra_payment' then coalesce(a.extra_amount_approved, 0) else 0 end
        - case when a.status = 'settled' and a.settlement = 'refund' then coalesce(a.refund_amount, 0) else 0 end
      )
    ), 0) into v_used
    from public.welfare_claim c
    left join public.welfare_claim_advance a on a.claim_id = c.id
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
comment on function public.guard_welfare_claim() is 'ตรวจเส้นทางสถานะ และสิทธิ์ จำนวนครั้ง วงเงิน (รวมจ่ายเพิ่ม/หักคืนเงินล่วงหน้า) ใบเสร็จซ้ำ เมื่อยื่นคำขอ';
revoke execute on function public.guard_welfare_claim() from public, anon, authenticated;
