-- =============================================================================
-- ขั้น 5: ข้อมูลตัวอย่าง (ไม่ใช่ migration)
--   - รหัสพนักงาน E00009..E00018 ต่อจากรหัสจริงในตาราง users เดิม (E00001..E00008)
--   - บัญชีล็อกอินตัวอย่างใน auth.users ไม่มีรหัสผ่าน จึงล็อกอินไม่ได้
--     ถ้าจะใช้ล็อกอินจริง ให้ตั้งรหัสผ่านผ่าน Dashboard / Admin API
--   - รันซ้ำได้ (on conflict do nothing) ต้องรันด้วย postgres / service role
--   - ลบทีหลังไม่ได้ เพราะห้ามลบจริง (ใช้ soft delete) และ audit_log ลบไม่ได้
--
-- โครงสร้าง:
--   E00009 ประธานเจ้าหน้าที่บริหาร (EXEC)               SUPER_ADMIN
--   ├─ E00010 ผู้จัดการฝ่ายบุคคล (HRD)                   HR
--   │  ├─ E00011 เจ้าหน้าที่บุคคล                        HR
--   │  └─ E00017 เจ้าหน้าที่บุคคล (ลาออก 30 มิ.ย. 2569)   HR
--   ├─ E00012 ผู้จัดการฝ่ายการเงิน (FIN)                 FINANCE
--   │  ├─ E00013 นักบัญชี                                  FINANCE
--   │  └─ E00018 นักบัญชี (เสียชีวิต 15 ส.ค. 2569)         FINANCE
--   └─ E00014 ผู้จัดการฝ่ายไอที (IT)
--      ├─ E00015 นักพัฒนาระบบ (IT-DEV)
--      └─ E00016 นักพัฒนาระบบอาวุโส (IT-DEV, หัวหน้าแผนก)
--   ทุกคนมีบทบาท EMPLOYEE เป็นพื้นฐาน
-- =============================================================================


-- -----------------------------------------------------------------------------
-- บัญชีล็อกอินตัวอย่าง (ไม่มีรหัสผ่าน) ใช้ทดสอบ RLS ตาม role
-- -----------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'demo.admin@welfare.test',   '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'demo.hr@welfare.test',      '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'demo.finance@welfare.test', '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'demo.employee@welfare.test','{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'de000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'demo.hr.resigned@welfare.test', '{}', '{}', now(), now())
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- ระดับ / หน่วยงาน / ตำแหน่ง
-- -----------------------------------------------------------------------------

insert into public.job_level (code, name_th, rank_order) values
  ('L1', 'พนักงานปฏิบัติการ', 1),
  ('L2', 'หัวหน้างาน',       2),
  ('L3', 'ผู้จัดการ',         3),
  ('L4', 'ผู้บริหาร',         4)
on conflict (code) do nothing;

insert into public.department (code, name_th, name_en) values
  ('EXEC', 'สำนักบริหาร',              'Executive Office'),
  ('HRD',  'ฝ่ายทรัพยากรบุคคล',         'Human Resources'),
  ('FIN',  'ฝ่ายบัญชีและการเงิน',        'Finance & Accounting'),
  ('IT',   'ฝ่ายเทคโนโลยีสารสนเทศ',     'Information Technology')
on conflict (code) do nothing;

insert into public.department (code, name_th, name_en, parent_department_id)
select 'IT-DEV', 'แผนกพัฒนาระบบ', 'Software Development', d.id
from public.department d where d.code = 'IT'
on conflict (code) do nothing;

insert into public.position (code, name_th, name_en, default_job_level_id)
select v.code, v.name_th, v.name_en, l.id
from (values
  ('CEO',     'ประธานเจ้าหน้าที่บริหาร', 'Chief Executive Officer', 'L4'),
  ('HR_MGR',  'ผู้จัดการฝ่ายบุคคล',      'HR Manager',              'L3'),
  ('HR_OFF',  'เจ้าหน้าที่บุคคล',         'HR Officer',              'L1'),
  ('FIN_MGR', 'ผู้จัดการฝ่ายการเงิน',     'Finance Manager',         'L3'),
  ('ACC',     'นักบัญชี',                'Accountant',              'L1'),
  ('IT_MGR',  'ผู้จัดการฝ่ายไอที',        'IT Manager',              'L3'),
  ('DEV',     'นักพัฒนาระบบ',            'Software Developer',      'L1'),
  ('DEV_SR',  'นักพัฒนาระบบอาวุโส',       'Senior Developer',        'L2')
) as v(code, name_th, name_en, level_code)
join public.job_level l on l.code = v.level_code
on conflict (code) do nothing;


-- -----------------------------------------------------------------------------
-- พนักงาน (เพิ่มจากบนลงล่าง เพราะหัวหน้าต้องมีอยู่ก่อน)
-- -----------------------------------------------------------------------------

-- เพิ่มทีละแถวตามลำดับ เพื่อให้หัวหน้าถูกเพิ่มก่อนลูกน้อง และ work_history ช่วงแรกมีหัวหน้าถูกต้อง
do $$
declare
  v record;
begin
  for v in
    select * from (values
  -- ลำดับสำคัญ: หัวหน้าต้องมาก่อนลูกน้อง
  (1,  'E00009', 'de000000-0000-4000-8000-000000000001', 'นาย',    'ธนากร',  'ศรีสุข',    'Thanakorn', 'Srisuk',     'กร',   'demo.admin@welfare.test',     '081-000-0001', '99 ถ.สุขุมวิท',   'คลองเตย',  'คลองเตย',  'กรุงเทพมหานคร', '10110', 'EXEC',   'CEO',     null,       '2015-01-05'),
  (2,  'E00010', 'de000000-0000-4000-8000-000000000002', 'นาง',    'พิมพ์ชนก', 'วงศ์ไทย',   'Pimchanok', 'Wongthai',   'พิม',  'demo.hr@welfare.test',        '081-000-0002', '12 ซ.ลาดพร้าว 15', 'จอมพล',    'จตุจักร',   'กรุงเทพมหานคร', '10900', 'HRD',    'HR_MGR',  'E00009', '2017-03-01'),
  (3,  'E00011', null,                                   'นางสาว', 'กมลวรรณ', 'แก้วมณี',   'Kamonwan',  'Kaewmanee',  'แก้ว', 'kamonwan.demo@welfare.test',  '081-000-0003', '45/2 ถ.งามวงศ์วาน', 'บางกระสอ', 'เมืองนนทบุรี', 'นนทบุรี',     '11000', 'HRD',    'HR_OFF',  'E00010', '2021-06-01'),
  (4,  'E00012', 'de000000-0000-4000-8000-000000000004', 'นาย',    'วีรพงษ์', 'ทองดี',     'Weerapong', 'Thongdee',   'วี',   'demo.finance@welfare.test',   '081-000-0004', '8 ถ.พหลโยธิน',     'สามเสนใน', 'พญาไท',    'กรุงเทพมหานคร', '10400', 'FIN',    'FIN_MGR', 'E00009', '2016-09-15'),
  (5,  'E00013', null,                                   'นางสาว', 'ณัฐธิดา', 'บุญมา',     'Nattida',   'Boonma',     'ณัฐ',  'nattida.demo@welfare.test',   '081-000-0005', '77 ม.3',           'บางพลีใหญ่', 'บางพลี',   'สมุทรปราการ',  '10540', 'FIN',    'ACC',     'E00012', '2022-02-01'),
  (6,  'E00014', null,                                   'นาย',    'อนุชา',   'ประเสริฐศรี', 'Anucha',   'Prasertsri', 'นุ',   'anucha.demo@welfare.test',    '081-000-0006', '300 ถ.รามคำแหง',   'หัวหมาก',  'บางกะปิ',   'กรุงเทพมหานคร', '10240', 'IT',     'IT_MGR',  'E00009', '2018-04-02'),
  (7,  'E00015', 'de000000-0000-4000-8000-000000000007', 'นาย',    'ภูมิพัฒน์', 'จันทร์เพ็ญ', 'Phumipat', 'Chanpen',    'ภูมิ', 'demo.employee@welfare.test',  '081-000-0007', '21 ถ.ติวานนท์',    'ตลาดขวัญ', 'เมืองนนทบุรี', 'นนทบุรี',     '11000', 'IT-DEV', 'DEV',     'E00014', '2023-07-03'),
  (8,  'E00016', null,                                   'นางสาว', 'ศิริพร',  'มีสุข',     'Siriporn',  'Meesuk',     'ศิ',   'siriporn.demo@welfare.test',  '081-000-0008', '5 ถ.เพชรเกษม',     'บางหว้า',  'ภาษีเจริญ', 'กรุงเทพมหานคร', '10160', 'IT-DEV', 'DEV_SR',  'E00014', '2019-11-11'),
  (9,  'E00017', 'de000000-0000-4000-8000-000000000009', 'นาย',    'ชยพล',   'สายทอง',    'Chayapol',  'Saithong',   'ชัย',  'demo.hr.resigned@welfare.test','081-000-0009', '18 ถ.นวมินทร์',    'คลองกุ่ม', 'บึงกุ่ม',   'กรุงเทพมหานคร', '10240', 'HRD',    'HR_OFF',  'E00010', '2020-01-06'),
  (10, 'E00018', null,                                   'นาง',    'สมพร',   'รุ่งเรือง',  'Somporn',   'Rungruang',  'พร',   'somporn.demo@welfare.test',   '081-000-0010', '60 ม.5',           'บ้านใหม่', 'ปากเกร็ด',  'นนทบุรี',     '11120', 'FIN',    'ACC',     'E00012', '2012-05-14')
    ) as t(ord, code, auth_user_id, title, fn, ln, fn_en, ln_en, nick, email, phone, addr, subdistrict, district,
           province, postal, dept_code, pos_code, mgr_code, hire_date)
    order by ord
  loop
    insert into public.employee (
      employee_code, auth_user_id, title_th, first_name_th, last_name_th, first_name_en, last_name_en, nickname,
      email, phone, address_line, subdistrict, district, province, postal_code,
      department_id, position_id, job_level_id, manager_employee_id, hire_date
    )
    select
      v.code, v.auth_user_id::uuid, v.title, v.fn, v.ln, v.fn_en, v.ln_en, v.nick,
      v.email, v.phone, v.addr, v.subdistrict, v.district, v.province, v.postal,
      d.id, p.id, p.default_job_level_id,
      (select m.id from public.employee m where m.employee_code = v.mgr_code),
      v.hire_date::date
    from public.department d, public.position p
    where d.code = v.dept_code and p.code = v.pos_code
    on conflict (employee_code) do nothing;
  end loop;
end;
$$;

-- หัวหน้าหน่วยงาน
update public.department d
   set head_employee_id = e.id
  from (values ('EXEC', 'E00009'), ('HRD', 'E00010'), ('FIN', 'E00012'), ('IT', 'E00014'), ('IT-DEV', 'E00016'))
       as v(dept_code, emp_code)
  join public.employee e on e.employee_code = v.emp_code
 where d.code = v.dept_code
   and d.head_employee_id is null;

-- สถานะลาออก / เสียชีวิต (เปลี่ยนผ่าน update เพื่อให้มี work_history และ audit_log แบบใช้งานจริง)
update public.employee
   set employment_status = 'resigned', resigned_date = '2026-06-30', status_reason = 'ลาออกเพื่อศึกษาต่อ'
 where employee_code = 'E00017' and employment_status = 'active';

update public.employee
   set employment_status = 'deceased', deceased_date = '2026-08-15', status_reason = 'เสียชีวิตด้วยโรคประจำตัว'
 where employee_code = 'E00018' and employment_status = 'active';


-- -----------------------------------------------------------------------------
-- บทบาท (SUPER_ADMIN คนแรกต้องมอบผ่าน postgres / service role เพราะยังไม่มีใครมี role.grant)
-- -----------------------------------------------------------------------------

insert into public.user_role (employee_id, role_id)
select e.id, r.id
from (values
  ('E00009', 'EMPLOYEE'), ('E00009', 'SUPER_ADMIN'),
  ('E00010', 'EMPLOYEE'), ('E00010', 'HR'),
  ('E00011', 'EMPLOYEE'), ('E00011', 'HR'),
  ('E00012', 'EMPLOYEE'), ('E00012', 'FINANCE'),
  ('E00013', 'EMPLOYEE'), ('E00013', 'FINANCE'),
  ('E00014', 'EMPLOYEE'),
  ('E00015', 'EMPLOYEE'),
  ('E00016', 'EMPLOYEE'),
  ('E00017', 'EMPLOYEE'), ('E00017', 'HR'),
  ('E00018', 'EMPLOYEE'), ('E00018', 'FINANCE')
) as v(emp_code, role_code)
join public.employee e on e.employee_code = v.emp_code
join public.app_role r on r.code = v.role_code
where not exists (
  select 1 from public.user_role ur
  where ur.employee_id = e.id and ur.role_id = r.id and ur.revoked_at is null
);

-- ให้รหัสพนักงานอัตโนมัติ (employee_code_seq) เริ่มต่อจากรหัสสูงสุดที่ seed ใส่ไว้
select setval('public.employee_code_seq',
              greatest(1, coalesce((select max(substr(employee_code, 2)::int) from public.employee), 0)),
              exists (select 1 from public.employee));


-- -----------------------------------------------------------------------------
-- การแจ้งเตือนของ Admin (ตัวอย่าง) — ใส่เฉพาะตอนที่ตารางยังว่าง จึงรันซ้ำได้
-- -----------------------------------------------------------------------------

insert into public.admin_notifications (category, title, description, actionable, created_at)
select v.category, v.title, v.description, v.actionable, now() - v.age
from (values
  ('security', 'ล็อกอินผิดซ้ำ 5 ครั้ง',             'บัญชี demo.hr@welfare.test ถูกล็อก 15 นาที',                         true,  interval '20 minutes'),
  ('access',   'คำขอสิทธิ์ฝ่ายบุคคล (HR)',           'E00011 ขอสิทธิ์เข้าถึงโมดูลจัดการพนักงาน',                           true,  interval '2 hours'),
  ('welfare',  'เพิ่มสวัสดิการใหม่',                 'ค่าตรวจสุขภาพประจำปี วงเงิน ฿5,000 ต่อปี รอตรวจสอบก่อนเปิดใช้',      true,  interval '4 hours'),
  ('expiring', 'สิทธิ์รักษาการใกล้หมดอายุ',          'E00010 สิทธิ์ผู้อนุมัติชั่วคราว · เหลือ 2 วัน',                        false, interval '5 hours'),
  ('access',   'ปรับสิทธิ์ผู้ใช้งานแล้ว',             'E00009 เปลี่ยนบทบาทของ E00011 จาก พนักงาน เป็น ฝ่ายบุคคล (HR)',       false, interval '1 day'),
  ('system',   'ประกาศจากระบบ',                     'มีการปรับปรุงระบบคืนวันเสาร์ 22:00–02:00 น.',                         false, interval '1 day 3 hours'),
  ('welfare',  'แก้ไขวงเงินสวัสดิการ',               'ค่าออกกำลังกาย / ฟิตเนส ปรับเป็น ฿12,000 ต่อปี',                      false, interval '3 days'),
  ('system',   'นำเข้าประวัติเบิกย้อนหลังสำเร็จ',     '7 รายการจากไฟล์ import_sep.csv',                                    false, interval '5 days'),
  ('security', 'เข้าสู่ระบบจากอุปกรณ์ใหม่',           'บัญชี E00009 · กรุงเทพฯ',                                            false, interval '12 days')
) as v(category, title, description, actionable, age)
where not exists (select 1 from public.admin_notifications);


-- -----------------------------------------------------------------------------
-- สวัสดิการ (ตัวอย่าง ตรงกับ welfareItems ใน src/data/mock.ts) — รันซ้ำได้
--   WEL-002 มีวงเงิน 2 ช่วง: ฿10,000 ใช้อยู่ และ ฿12,000 มีผล 1 ม.ค. 2570
-- -----------------------------------------------------------------------------

insert into public.welfare_benefit (code, name_th, budget_type, max_claims, max_claims_note, eligibility_note, approver_role_id, is_active)
select v.code, v.name_th, v.budget_type::public.welfare_budget_type, v.max_claims, v.max_claims_note, 'พนักงานประจำ',
       (select id from public.app_role where code = 'HR'), v.is_active
from (values
  ('WEL-001', 'ค่าเครื่องมือ AI สำหรับพนักงาน', 'yearly',    12,   null,                  true),
  ('WEL-002', 'ค่าออกกำลังกาย / ฟิตเนส',        'yearly',    12,   null,                  true),
  ('WEL-003', 'ค่าตัดแว่นสายตา',                'yearly',    1,    null,                  true),
  ('WEL-004', 'วัคซีนไข้หวัดใหญ่',              'yearly',    1,    null,                  true),
  ('WEL-005', 'ทุนอบรมหลักสูตรภายนอก',          'yearly',    2,    null,                  true),
  ('WEL-006', 'ค่าเดินทางมาทำงาน',              'monthly',   null, null,                  true),
  ('WEL-007', 'ค่าฝากครรภ์ / คลอดบุตร',         'per_claim', null, 'ต่อการคลอด 1 ครั้ง',  true),
  ('WEL-008', 'ค่าอาหารกลางวัน',                'monthly',   null, null,                  false),
  ('WEL-010', 'ค่าเดินทางไปอบรม',               'per_claim', null, null,                  true),
  ('WEL-011', 'ค่าตรวจสุขภาพ',                  'yearly',    1,    null,                  true)
) as v(code, name_th, budget_type, max_claims, max_claims_note, is_active)
on conflict (code) do nothing;

insert into public.welfare_benefit_limit (benefit_id, amount, effective_from, reason)
select b.id, v.amount, v.effective_from::date, v.reason
from (values
  ('WEL-001', 6000,  '2026-11-01', null),
  ('WEL-002', 10000, '2026-01-01', null),
  ('WEL-002', 12000, '2027-01-01', 'ปรับตามอัตราตลาด'),
  ('WEL-003', 3000,  '2026-01-01', null),
  ('WEL-004', 1500,  '2026-01-01', null),
  ('WEL-005', 20000, '2026-01-01', null),
  ('WEL-006', 800,   '2026-01-01', null),
  ('WEL-007', 25000, '2026-01-01', null),
  ('WEL-008', 2500,  '2026-01-01', null),
  ('WEL-010', 5000,  '2026-01-01', null),
  ('WEL-011', 4000,  '2026-01-01', null)
) as v(code, amount, effective_from, reason)
join public.welfare_benefit b on b.code = v.code
on conflict (benefit_id, effective_from) do nothing;

-- WEL-001 ใช้เฉพาะฝ่ายไอที
insert into public.welfare_benefit_department (benefit_id, department_id)
select b.id, d.id
from public.welfare_benefit b
join public.department d on d.code = 'IT'
where b.code = 'WEL-001'
on conflict do nothing;
