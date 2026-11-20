-- ปุ่ม "บันทึกจ่ายแล้ว" ในหน้ารายการอนุมัติ / รอจ่าย (F01) และรายละเอียดคำขอ (F05)
-- เดิม guard_welfare_claim_event ไม่ได้ตรวจเหตุการณ์ 'paid' เจ้าของคำขอที่เป็นการเงินจึงบันทึกจ่ายให้ตัวเองได้
-- เพิ่ม 'paid' ให้ต้องระบุผู้ดำเนินการ และผู้ดำเนินการต้องไม่ใช่เจ้าของคำขอ (ฝั่งแอปตรวจผู้ยื่นแทนด้วย)

create or replace function public.guard_welfare_claim_event()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  if new.kind in ('revision_requested', 'hr_approved', 'finance_approved', 'amount_adjusted', 'returned', 'rejected', 'paid') then
    select c.employee_id into v_owner from public.welfare_claim c where c.id = new.claim_id;
    if new.actor_employee_id is null then
      raise exception 'การอนุมัติ ปฏิเสธ หรือบันทึกจ่ายต้องระบุผู้ดำเนินการ' using errcode = 'P0001';
    end if;
    if new.actor_employee_id = v_owner then
      raise exception 'ผู้ดำเนินการต้องไม่ใช่เจ้าของคำขอ' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_welfare_claim_event() from public, anon, authenticated;
