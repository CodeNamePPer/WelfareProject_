-- =============================================================================
-- วงเงินรวมต่อปี: แก้แถวที่มีผลวันนี้หรือวันหลังได้ (กรอกผิดแล้วแก้ในวันเดียวกัน)
--
-- unique (employee_id, effective_from) ทำให้เพิ่มแถวที่สองของวันเดียวกันไม่ได้ แอปจึงบันทึกทับแถวเดิม
-- แถวที่มีผลก่อนวันนี้ยังแก้ไม่ได้เหมือนเดิม (เป็นประวัติที่คำขอเคยถูกตรวจด้วย)
-- คำขอที่ยื่นไปแล้วไม่ถูกตรวจซ้ำ เหมือนวงเงินแยกสวัสดิการ
-- =============================================================================

create or replace function public.guard_welfare_total_limit_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.effective_from < (now() at time zone 'Asia/Bangkok')::date then
    raise exception 'วงเงินรวมที่มีผลแล้วแก้ไขไม่ได้ ให้เพิ่มวงเงินรวมใหม่พร้อมวันที่มีผลแทน' using errcode = 'P0001';
  end if;
  if new.employee_id <> old.employee_id or new.effective_from <> old.effective_from then
    raise exception 'เปลี่ยนพนักงานหรือวันที่มีผลของวงเงินรวมไม่ได้' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
comment on function public.guard_welfare_total_limit_update() is 'แก้วงเงินรวมได้เฉพาะแถวที่มีผลวันนี้หรือวันหลัง (วันที่ตามเวลาไทย)';
revoke execute on function public.guard_welfare_total_limit_update() from public, anon, authenticated;

grant update on public.welfare_employee_total_limit to service_role;
