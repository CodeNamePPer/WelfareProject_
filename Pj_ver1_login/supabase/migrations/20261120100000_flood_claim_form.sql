-- ค่าใช้จ่ายน้ำท่วม (WEL-017) ใช้แบบฟอร์มเฉพาะ 'flood' แทนแบบฟอร์มทั่วไป
-- ผู้ยื่นเลือกที่อยู่ (ตามระบบ / กรอกเอง) สถานะน้ำท่วม และระดับผลกระทบ ยอดเบิกตายตัวตามระดับ 3,000 / 5,000 / 10,000 บาท
-- ไม่มีใบเสร็จ แนบรูปหลักฐานแทน (ฝั่งแอปข้ามการตรวจใบเสร็จตาม form_type)
-- วงเงินเดิม 9,000 ต่ำกว่าระดับ 3: วงเงินที่มีผลแล้วแก้ไม่ได้ (guard_welfare_limit_update)
-- จึงเพิ่มวงเงินใหม่ 10,000 มีผลวันนี้ (Asia/Bangkok) ทั้งวงเงินทั่วไปและรายระดับงานที่มีอยู่ วงเงินรายบุคคลไม่แตะ
-- น้ำท่วมที่เกิดก่อนวันนี้ยังใช้วงเงินเดิมตามวันที่มีผล (ระบบเลือกวงเงินจากวันที่เกิดค่าใช้จ่าย)
-- WEL-017 สร้างผ่านหน้าจอ ไม่มีใน seed: ถ้าไม่มีสวัสดิการนี้ คำสั่งไม่มีผล

update public.welfare_benefit
set form_type = 'flood'
where code = 'WEL-017'
  and deleted_at is null;

insert into public.welfare_benefit_limit (benefit_id, job_level_id, amount, effective_from, reason)
select distinct l.benefit_id, l.job_level_id, 10000, (now() at time zone 'Asia/Bangkok')::date, 'ระดับผลกระทบน้ำท่วมสูงสุด 10,000 บาท'
from public.welfare_benefit_limit l
join public.welfare_benefit b on b.id = l.benefit_id
where b.code = 'WEL-017'
  and l.employee_id is null
on conflict do nothing;
