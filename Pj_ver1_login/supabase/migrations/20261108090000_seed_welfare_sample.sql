-- ข้อมูลตั้งต้น: 12 รายการสวัสดิการตัวอย่าง (เดิมอยู่ใน src/data/mock.ts)
-- ตัวอย่างเดิมระบุวันเริ่มใช้ 1 ม.ค. 2570 ซึ่งยังไม่ถึงวันมีผล จึงตั้งเป็น 1 ม.ค. 2569 เพื่อให้มีวงเงินที่ใช้ได้ทันที

with sample(code, name_th, budget_type, max_claims_note, is_active, amount) as (
  values
    ('WEL-001', 'ค่าเครื่องมือ AI สำหรับพนักงาน', 'yearly',    'ไม่เกิน 12 ครั้ง/ปี', true,  6000),
    ('WEL-002', 'ค่าออกกำลังกาย / ฟิตเนส',       'yearly',    'ไม่เกิน 12 ครั้ง/ปี', true,  12000),
    ('WEL-003', 'ค่าตัดแว่นสายตา',               'yearly',    '1 ครั้ง/ปี',          true,  3000),
    ('WEL-004', 'วัคซีนไข้หวัดใหญ่',              'yearly',    '1 ครั้ง/ปี',          true,  1500),
    ('WEL-005', 'ทุนอบรมหลักสูตรภายนอก',         'yearly',    '2 ครั้ง/ปี',          true,  20000),
    ('WEL-006', 'ค่าเดินทางมาทำงาน',             'monthly',   'ไม่เกิน 12 ครั้ง/ปี', true,  9600),
    ('WEL-007', 'ค่าฝากครรภ์ / คลอดบุตร',        'yearly',    'ต่อการคลอด 1 ครั้ง',  true,  25000),
    ('WEL-008', 'ค่าอาหารกลางวัน',               'monthly',   'ไม่เกิน 12 ครั้ง/ปี', false, 2500),
    ('WEL-009', 'ค่าเครื่องมือ AI',               'yearly',    'ไม่เกิน 12 ครั้ง/ปี', true,  6000),
    ('WEL-010', 'ค่าเดินทางไปอบรม',              'per_claim', 'ไม่เกิน 12 ครั้ง/ปี', true,  5000),
    ('WEL-011', 'ค่าตรวจสุขภาพ',                 'yearly',    '1 ครั้ง/ปี',          true,  4000),
    ('WEL-012', 'ค่าใช้จ่ายอื่น ๆ',                'yearly',    'ไม่เกิน 12 ครั้ง/ปี', false, 8000)
),
inserted as (
  insert into public.welfare_benefit (code, name_th, budget_type, max_claims_note, eligibility_note, approver_role_id, is_active)
  select s.code, s.name_th, s.budget_type::public.welfare_budget_type, s.max_claims_note, 'พนักงานประจำ',
         (select id from public.app_role where code = 'HR'), s.is_active
  from sample s
  returning id, code
)
insert into public.welfare_benefit_limit (benefit_id, amount, effective_from, reason)
select i.id, s.amount, date '2026-01-01', 'ข้อมูลตัวอย่างตั้งต้น'
from inserted i
join sample s using (code);
