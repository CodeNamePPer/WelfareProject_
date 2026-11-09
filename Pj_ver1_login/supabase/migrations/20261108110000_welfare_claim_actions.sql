-- ฟังก์ชันที่แอปใช้เปลี่ยนสถานะคำขอ: สถานะ ประวัติ และการโอนต้องสำเร็จพร้อมกันใน transaction เดียว
-- และกรอกหมวด/ชนิดแบบฟอร์มให้ 12 รายการตัวอย่าง

update public.welfare_benefit b
set form_type = v.form_type, category = v.category
from (values
  ('WEL-001', 'general',  'อื่น ๆ'),
  ('WEL-002', 'general',  'สุขภาพ'),
  ('WEL-003', 'general',  'สุขภาพ'),
  ('WEL-004', 'general',  'สุขภาพ'),
  ('WEL-005', 'training', 'การเรียนรู้'),
  ('WEL-006', 'general',  'อื่น ๆ'),
  ('WEL-007', 'medical',  'ครอบครัว'),
  ('WEL-008', 'general',  'อื่น ๆ'),
  ('WEL-009', 'general',  'อื่น ๆ'),
  ('WEL-010', 'training', 'การเรียนรู้'),
  ('WEL-011', 'checkup',  'สุขภาพ'),
  ('WEL-012', 'general',  'อื่น ๆ')
) as v(code, form_type, category)
where b.code = v.code;


create function public.welfare_claim_transition(
  p_claim_id        uuid,
  p_from            public.welfare_claim_status,
  p_to              public.welfare_claim_status,
  p_kind            public.welfare_claim_event_kind,
  p_actor           uuid,
  p_actor_role      text,
  p_note            text default null,
  p_amount_approved numeric default null,
  p_pay_round_id    uuid default null
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status    public.welfare_claim_status;
  v_requested numeric;
begin
  select c.status, c.amount_requested into v_status, v_requested
  from public.welfare_claim c
  where c.id = p_claim_id and c.deleted_at is null
  for update;

  if v_status is distinct from p_from then
    raise exception 'สถานะคำขอเปลี่ยนไปแล้ว กรุณาโหลดหน้าใหม่' using errcode = 'P0001';
  end if;

  update public.welfare_claim
  set status = p_to,
      amount_approved = coalesce(p_amount_approved, amount_approved),
      pay_round_id = coalesce(p_pay_round_id, pay_round_id)
  where id = p_claim_id;

  if p_amount_approved is not null and p_amount_approved <> v_requested then
    insert into public.welfare_claim_event (claim_id, kind, from_status, to_status, actor_employee_id, actor_role, note, amount_before, amount_after)
    values (p_claim_id, 'amount_adjusted', p_from, p_to, p_actor, p_actor_role, p_note, v_requested, p_amount_approved);
  end if;

  insert into public.welfare_claim_event (claim_id, kind, from_status, to_status, actor_employee_id, actor_role, note)
  values (p_claim_id, p_kind, p_from, p_to, p_actor, p_actor_role, p_note);
end;
$$;
comment on function public.welfare_claim_transition is 'เปลี่ยนสถานะคำขอพร้อมบันทึกประวัติ ปฏิเสธถ้าสถานะเปลี่ยนไปแล้ว';


create function public.welfare_claim_record_payment(
  p_claim_id        uuid,
  p_bank_account_id uuid,
  p_bank_code       text,
  p_account_masked  text,
  p_transfer_ref    text,
  p_actor           uuid,
  p_actor_role      text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_status public.welfare_claim_status;
  v_amount numeric;
  v_round  uuid;
begin
  select c.status, coalesce(c.amount_approved, c.amount_requested), c.pay_round_id into v_status, v_amount, v_round
  from public.welfare_claim c
  where c.id = p_claim_id and c.deleted_at is null
  for update;

  if v_status is distinct from 'awaiting_payment' or v_round is null then
    raise exception 'คำขอนี้ไม่ได้อยู่ในสถานะรอจ่าย กรุณาโหลดหน้าใหม่' using errcode = 'P0001';
  end if;

  insert into public.welfare_claim_payment (claim_id, pay_round_id, bank_account_id, bank_code, account_no_masked, amount_gross, amount_net, status, transfer_ref, prepared_by, paid_at)
  values (p_claim_id, v_round, p_bank_account_id, p_bank_code, p_account_masked, v_amount, v_amount, 'transferred', p_transfer_ref, p_actor, now());

  update public.welfare_claim set status = 'paid' where id = p_claim_id;

  insert into public.welfare_claim_event (claim_id, kind, from_status, to_status, actor_employee_id, actor_role, note)
  values (p_claim_id, 'paid', 'awaiting_payment', 'paid', p_actor, p_actor_role, 'เลขอ้างอิงการโอน ' || p_transfer_ref);
end;
$$;
comment on function public.welfare_claim_record_payment is 'บันทึกการโอนสำเร็จ เปลี่ยนสถานะเป็นจ่ายแล้ว และเพิ่มประวัติ';


create function public.welfare_claim_set_pay_date(
  p_claim_id   uuid,
  p_date       date,
  p_actor      uuid,
  p_actor_role text,
  p_note       text
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.welfare_claim
  set pay_date_override = p_date
  where id = p_claim_id and status in ('pending_finance', 'awaiting_payment') and deleted_at is null;

  if not found then
    raise exception 'คำขอนี้เลื่อนวันจ่ายไม่ได้แล้ว กรุณาโหลดหน้าใหม่' using errcode = 'P0001';
  end if;

  insert into public.welfare_claim_event (claim_id, kind, actor_employee_id, actor_role, note)
  values (p_claim_id, 'pay_date_changed', p_actor, p_actor_role, p_note);
end;
$$;
comment on function public.welfare_claim_set_pay_date is 'เลื่อนหรือยกเลิกการเลื่อนวันจ่ายพร้อมบันทึกประวัติ';

revoke execute on function public.welfare_claim_transition(uuid, public.welfare_claim_status, public.welfare_claim_status, public.welfare_claim_event_kind, uuid, text, text, numeric, uuid) from public, anon, authenticated;
revoke execute on function public.welfare_claim_record_payment(uuid, uuid, text, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.welfare_claim_set_pay_date(uuid, date, uuid, text, text) from public, anon, authenticated;
grant execute on function public.welfare_claim_transition(uuid, public.welfare_claim_status, public.welfare_claim_status, public.welfare_claim_event_kind, uuid, text, text, numeric, uuid) to service_role;
grant execute on function public.welfare_claim_record_payment(uuid, uuid, text, text, text, uuid, text) to service_role;
grant execute on function public.welfare_claim_set_pay_date(uuid, date, uuid, text, text) to service_role;
