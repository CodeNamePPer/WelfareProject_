-- =============================================================================
-- ขั้น 5: ข้อมูลตัวอย่าง (ไม่ใช่ migration)
--   - รหัสพนักงานขึ้นต้น DEMO- ไม่ชนกับรหัสจริงในตาราง users เดิม (E0001...)
--   - บัญชีล็อกอินตัวอย่างใน auth.users ไม่มีรหัสผ่าน จึงล็อกอินไม่ได้
--     ถ้าจะใช้ล็อกอินจริง ให้ตั้งรหัสผ่านผ่าน Dashboard / Admin API
--   - รันซ้ำได้ (on conflict do nothing) ต้องรันด้วย postgres / service role
--   - ลบทีหลังไม่ได้ เพราะห้ามลบจริง (ใช้ soft delete) และ audit_log ลบไม่ได้
--
-- โครงสร้าง:
--   DEMO-001 ประธานเจ้าหน้าที่บริหาร (EXEC)               SUPER_ADMIN
--   ├─ DEMO-002 ผู้จัดการฝ่ายบุคคล (HRD)                   HR
--   │  ├─ DEMO-003 เจ้าหน้าที่บุคคล                        HR
--   │  └─ DEMO-009 เจ้าหน้าที่บุคคล (ลาออก 30 มิ.ย. 2569)   HR
--   ├─ DEMO-004 ผู้จัดการฝ่ายการเงิน (FIN)                 FINANCE
--   │  ├─ DEMO-005 นักบัญชี
--   │  └─ DEMO-010 นักบัญชี (เสียชีวิต 15 ส.ค. 2569)
--   └─ DEMO-006 ผู้จัดการฝ่ายไอที (IT)
--      ├─ DEMO-007 นักพัฒนาระบบ (IT-DEV)
--      └─ DEMO-008 นักพัฒนาระบบอาวุโส (IT-DEV, หัวหน้าแผนก)
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
  (1,  'DEMO-001', 'de000000-0000-4000-8000-000000000001', 'นาย',    'ธนากร',  'ศรีสุข',    'Thanakorn', 'Srisuk',     'กร',   'demo.admin@welfare.test',     '081-000-0001', '99 ถ.สุขุมวิท',   'คลองเตย',  'คลองเตย',  'กรุงเทพมหานคร', '10110', 'EXEC',   'CEO',     null,       '2015-01-05'),
  (2,  'DEMO-002', 'de000000-0000-4000-8000-000000000002', 'นาง',    'พิมพ์ชนก', 'วงศ์ไทย',   'Pimchanok', 'Wongthai',   'พิม',  'demo.hr@welfare.test',        '081-000-0002', '12 ซ.ลาดพร้าว 15', 'จอมพล',    'จตุจักร',   'กรุงเทพมหานคร', '10900', 'HRD',    'HR_MGR',  'DEMO-001', '2017-03-01'),
  (3,  'DEMO-003', null,                                   'นางสาว', 'กมลวรรณ', 'แก้วมณี',   'Kamonwan',  'Kaewmanee',  'แก้ว', 'kamonwan.demo@welfare.test',  '081-000-0003', '45/2 ถ.งามวงศ์วาน', 'บางกระสอ', 'เมืองนนทบุรี', 'นนทบุรี',     '11000', 'HRD',    'HR_OFF',  'DEMO-002', '2021-06-01'),
  (4,  'DEMO-004', 'de000000-0000-4000-8000-000000000004', 'นาย',    'วีรพงษ์', 'ทองดี',     'Weerapong', 'Thongdee',   'วี',   'demo.finance@welfare.test',   '081-000-0004', '8 ถ.พหลโยธิน',     'สามเสนใน', 'พญาไท',    'กรุงเทพมหานคร', '10400', 'FIN',    'FIN_MGR', 'DEMO-001', '2016-09-15'),
  (5,  'DEMO-005', null,                                   'นางสาว', 'ณัฐธิดา', 'บุญมา',     'Nattida',   'Boonma',     'ณัฐ',  'nattida.demo@welfare.test',   '081-000-0005', '77 ม.3',           'บางพลีใหญ่', 'บางพลี',   'สมุทรปราการ',  '10540', 'FIN',    'ACC',     'DEMO-004', '2022-02-01'),
  (6,  'DEMO-006', null,                                   'นาย',    'อนุชา',   'ประเสริฐศรี', 'Anucha',   'Prasertsri', 'นุ',   'anucha.demo@welfare.test',    '081-000-0006', '300 ถ.รามคำแหง',   'หัวหมาก',  'บางกะปิ',   'กรุงเทพมหานคร', '10240', 'IT',     'IT_MGR',  'DEMO-001', '2018-04-02'),
  (7,  'DEMO-007', 'de000000-0000-4000-8000-000000000007', 'นาย',    'ภูมิพัฒน์', 'จันทร์เพ็ญ', 'Phumipat', 'Chanpen',    'ภูมิ', 'demo.employee@welfare.test',  '081-000-0007', '21 ถ.ติวานนท์',    'ตลาดขวัญ', 'เมืองนนทบุรี', 'นนทบุรี',     '11000', 'IT-DEV', 'DEV',     'DEMO-006', '2023-07-03'),
  (8,  'DEMO-008', null,                                   'นางสาว', 'ศิริพร',  'มีสุข',     'Siriporn',  'Meesuk',     'ศิ',   'siriporn.demo@welfare.test',  '081-000-0008', '5 ถ.เพชรเกษม',     'บางหว้า',  'ภาษีเจริญ', 'กรุงเทพมหานคร', '10160', 'IT-DEV', 'DEV_SR',  'DEMO-006', '2019-11-11'),
  (9,  'DEMO-009', 'de000000-0000-4000-8000-000000000009', 'นาย',    'ชยพล',   'สายทอง',    'Chayapol',  'Saithong',   'ชัย',  'demo.hr.resigned@welfare.test','081-000-0009', '18 ถ.นวมินทร์',    'คลองกุ่ม', 'บึงกุ่ม',   'กรุงเทพมหานคร', '10240', 'HRD',    'HR_OFF',  'DEMO-002', '2020-01-06'),
  (10, 'DEMO-010', null,                                   'นาง',    'สมพร',   'รุ่งเรือง',  'Somporn',   'Rungruang',  'พร',   'somporn.demo@welfare.test',   '081-000-0010', '60 ม.5',           'บ้านใหม่', 'ปากเกร็ด',  'นนทบุรี',     '11120', 'FIN',    'ACC',     'DEMO-004', '2012-05-14')
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
  from (values ('EXEC', 'DEMO-001'), ('HRD', 'DEMO-002'), ('FIN', 'DEMO-004'), ('IT', 'DEMO-006'), ('IT-DEV', 'DEMO-008'))
       as v(dept_code, emp_code)
  join public.employee e on e.employee_code = v.emp_code
 where d.code = v.dept_code
   and d.head_employee_id is null;

-- สถานะลาออก / เสียชีวิต (เปลี่ยนผ่าน update เพื่อให้มี work_history และ audit_log แบบใช้งานจริง)
update public.employee
   set employment_status = 'resigned', resigned_date = '2026-06-30', status_reason = 'ลาออกเพื่อศึกษาต่อ'
 where employee_code = 'DEMO-009' and employment_status = 'active';

update public.employee
   set employment_status = 'deceased', deceased_date = '2026-08-15', status_reason = 'เสียชีวิตด้วยโรคประจำตัว'
 where employee_code = 'DEMO-010' and employment_status = 'active';


-- -----------------------------------------------------------------------------
-- บทบาท (SUPER_ADMIN คนแรกต้องมอบผ่าน postgres / service role เพราะยังไม่มีใครมี role.grant)
-- -----------------------------------------------------------------------------

insert into public.user_role (employee_id, role_id)
select e.id, r.id
from (values
  ('DEMO-001', 'EMPLOYEE'), ('DEMO-001', 'SUPER_ADMIN'),
  ('DEMO-002', 'EMPLOYEE'), ('DEMO-002', 'HR'),
  ('DEMO-003', 'EMPLOYEE'), ('DEMO-003', 'HR'),
  ('DEMO-004', 'EMPLOYEE'), ('DEMO-004', 'FINANCE'),
  ('DEMO-005', 'EMPLOYEE'),
  ('DEMO-006', 'EMPLOYEE'),
  ('DEMO-007', 'EMPLOYEE'),
  ('DEMO-008', 'EMPLOYEE'),
  ('DEMO-009', 'EMPLOYEE'), ('DEMO-009', 'HR'),
  ('DEMO-010', 'EMPLOYEE')
) as v(emp_code, role_code)
join public.employee e on e.employee_code = v.emp_code
join public.app_role r on r.code = v.role_code
where not exists (
  select 1 from public.user_role ur
  where ur.employee_id = e.id and ur.role_id = r.id and ur.revoked_at is null
);
