-- ค่าใช้จ่ายน้ำท่วม (WEL-017): น้ำท่วมเกิดก่อนวันที่ยื่นได้ แต่วงเงินแรกมีผล 2026-11-19 (ระบบเลือกวงเงินจากวันที่เกิดค่าใช้จ่าย)
-- น้ำท่วมก่อนวันนั้นจึงยื่นไม่ได้ เพิ่มวงเงิน 10,000 มีผลตั้งแต่ 2026-01-01 ทั้งวงเงินทั่วไปและรายระดับงาน
-- วงเงิน 9,000 ที่มีผล 2026-11-19 แก้หรือลบไม่ได้ (guard_welfare_limit_update / prevent_hard_delete) และมีคำขออ้างอิง
-- ผลคือ น้ำท่วมวันที่ 1 ม.ค.–18 พ.ย. ใช้ 10,000 · 19 พ.ย. ใช้ 9,000 · ตั้งแต่ 20 พ.ย. ใช้ 10,000
-- ถ้าไม่มีสวัสดิการนี้ (เครื่อง local) คำสั่งไม่มีผล

insert into public.welfare_benefit_limit (benefit_id, job_level_id, amount, effective_from, reason)
select distinct l.benefit_id, l.job_level_id, 10000, date '2026-01-01', 'น้ำท่วมที่เกิดก่อนเปิดสวัสดิการ ยื่นได้ตามระดับผลกระทบ'
from public.welfare_benefit_limit l
join public.welfare_benefit b on b.id = l.benefit_id
where b.code = 'WEL-017'
  and l.employee_id is null
on conflict do nothing;
