-- =============================================================================
-- ขั้น 5: ทดสอบสิทธิ์ตาม role บนฐานข้อมูลจริง
--   - ต้องรันหลัง seed.sql ในคำสั่งเดียวกัน (หรือบนฐานที่ seed แล้ว) ด้วย postgres
--   - สวมบทบาทผู้ใช้ด้วย set role authenticated + request.jwt.claims (แบบเดียวกับ PostgREST)
--   - ทุกข้อรันใน subtransaction แล้ว rollback ทันที ข้อหนึ่งไม่กระทบข้ออื่น
--   - จบด้วย raise exception เสมอ เพื่อ rollback ทั้งหมด (รวม seed ถ้ารันพร้อมกัน)
--     ผลลัพธ์อยู่ในข้อความ error: "ROLLBACK passed=N failed=N ..."
-- =============================================================================

do $test$
declare
  -- ผู้ใช้ทดสอบ (auth.users.id จาก seed.sql)
  c_uid constant jsonb := jsonb_build_object(
    'SUPER_ADMIN', 'de000000-0000-4000-8000-000000000001',
    'HR',          'de000000-0000-4000-8000-000000000002',
    'FINANCE',     'de000000-0000-4000-8000-000000000004',
    'EMPLOYEE',    'de000000-0000-4000-8000-000000000007',
    'HR_RESIGNED', 'de000000-0000-4000-8000-000000000009',
    'NO_EMPLOYEE', 'de000000-0000-4000-8000-0000000000ff'  -- ล็อกอินได้แต่ไม่ได้ผูกกับพนักงาน
  );
  t        record;
  v_n      bigint;
  v_actual text;
  v_ok     boolean;
  v_pass   integer := 0;
  v_fail   integer := 0;
  v_lines  text := '';
  v_hr_id  uuid;
  v_emp7   uuid;
  v_emp5   uuid;
  v_row    record;
  v_ids    jsonb;   -- {E000xx} / {ROLE:x} / {PERM:x} -> uuid ใช้แทนค่าใน sql ที่ผู้ใช้อ่านตารางนั้นไม่ได้
  v_sql    text;
  v_key    text;
begin
  select jsonb_object_agg(k, id) into v_ids from (
    select employee_code as k, id from public.employee
    union all select 'ROLE:' || code, id from public.app_role
    union all select 'PERM:' || code, id from public.permission
  ) m;
  select id into v_hr_id from public.employee where employee_code = 'E00010';
  select id into v_emp7  from public.employee where employee_code = 'E00015';
  select id into v_emp5  from public.employee where employee_code = 'E00013';
  if v_hr_id is null then
    raise exception 'ไม่พบข้อมูล seed (E00010) ให้รัน seed.sql ก่อน';
  end if;

  -- ---------------------------------------------------------------------------
  -- ข้อทดสอบทั่วไป
  --   kind  rows = นับแถวที่ select ได้, exec = นับแถวที่คำสั่งแก้ได้
  --   expect ตัวเลข หรือ ERR / ERR:<sqlstate> = ต้องถูกปฏิเสธ
  -- ---------------------------------------------------------------------------
  for t in
    select * from (values
      -- anon: เข้าไม่ได้เลย
      ('anon', 'ดูพนักงาน',                 'rows', 'select * from public.employee', 'ERR:42501'),
      ('anon', 'ดู audit_log',              'rows', 'select * from public.audit_log', 'ERR:42501'),
      ('anon', 'ดูหน่วยงาน',                'rows', 'select * from public.department', 'ERR:42501'),
      ('anon', 'เรียก my_permissions()',     'rows', 'select 1 where public.my_permissions() is not null', 'ERR:42501'),  -- ต้องอยู่ใน where: ถ้าอยู่ใน select list ที่ count(*) ครอบ planner ตัดทิ้งโดยไม่ตรวจสิทธิ์

      -- ล็อกอินแต่ไม่ได้ผูกกับพนักงาน
      ('NO_EMPLOYEE', 'ดูพนักงาน',           'rows', 'select * from public.employee', '0'),
      ('NO_EMPLOYEE', 'สิทธิ์ว่าง',           'rows', 'select 1 where public.my_permissions() = ''{}''::text[]', '1'),
      ('NO_EMPLOYEE', 'แก้ข้อมูลพนักงาน',     'exec', 'update public.employee set phone = ''000''', '0'),

      -- EMPLOYEE (ยังไม่มีสิทธิ์ใดๆ)
      ('EMPLOYEE', 'ดูพนักงาน',              'rows', 'select * from public.employee', '0'),
      ('EMPLOYEE', 'ดูหน่วยงาน/ตำแหน่ง/ระดับ', 'rows', 'select id from public.department union all select id from public.position union all select id from public.job_level', '0'),
      ('EMPLOYEE', 'ดูประวัติการทำงาน',       'rows', 'select * from public.work_history', '0'),
      ('EMPLOYEE', 'ดู audit_log',           'rows', 'select * from public.audit_log', '0'),
      ('EMPLOYEE', 'ดูบทบาทของตัวเอง',        'rows', 'select * from public.user_role', '1'),
      ('EMPLOYEE', 'สิทธิ์ว่าง',              'rows', 'select 1 where public.my_permissions() = ''{}''::text[]', '1'),
      ('EMPLOYEE', 'แก้ข้อมูลพนักงานทุกคน',   'exec', 'update public.employee set phone = ''000''', '0'),
      ('EMPLOYEE', 'เพิ่มพนักงาน',            'exec', 'insert into public.employee (employee_code, first_name_th, last_name_th, email, hire_date) values (''X1'', ''ก'', ''ข'', ''x1@welfare.test'', current_date)', 'ERR:42501'),
      ('EMPLOYEE', 'มอบบทบาท HR ให้ตัวเอง',   'exec', 'insert into public.user_role (employee_id, role_id) values ({E00015}, {ROLE:HR})', 'ERR:42501'),
      ('EMPLOYEE', 'ลบพนักงาน',              'exec', 'delete from public.employee', 'ERR:42501'),
      ('EMPLOYEE', 'เขียน audit_log ตรง',     'exec', 'insert into public.audit_log (table_name, record_id, action, changes, actor_db_role) values (''x'', ''x'', ''INSERT'', ''{}'', ''x'')', 'ERR:42501'),

      -- FINANCE (ยังไม่มีสิทธิ์ใดๆ รอทีมยืนยัน)
      ('FINANCE', 'ดูพนักงาน',               'rows', 'select * from public.employee', '0'),
      ('FINANCE', 'แก้ข้อมูลพนักงาน',         'exec', 'update public.employee set phone = ''000''', '0'),
      ('FINANCE', 'สิทธิ์ว่าง',               'rows', 'select 1 where public.my_permissions() = ''{}''::text[]', '1'),

      -- HR ที่ลาออกแล้ว: สิทธิ์หายทันที
      ('HR_RESIGNED', 'ดูพนักงาน',           'rows', 'select * from public.employee', '0'),
      ('HR_RESIGNED', 'แก้ข้อมูลพนักงาน',     'exec', 'update public.employee set phone = ''000''', '0'),
      ('HR_RESIGNED', 'สิทธิ์ว่าง',           'rows', 'select 1 where public.my_permissions() = ''{}''::text[]', '1'),

      -- HR: ดู/ค้นหา/กรอง
      ('HR', 'ดูพนักงานทั้งหมด',              'rows', 'select * from public.employee', '10'),
      ('HR', 'กรองแผนก IT-DEV ที่ทำงานอยู่',   'rows', 'select e.* from public.employee e join public.department d on d.id = e.department_id where d.code = ''IT-DEV'' and e.employment_status = ''active''', '2'),
      ('HR', 'กรองระดับ L3',                 'rows', 'select e.* from public.employee e join public.job_level l on l.id = e.job_level_id where l.code = ''L3''', '3'),
      ('HR', 'กรองสถานะลาออก',               'rows', 'select * from public.employee where employment_status = ''resigned''', '1'),
      ('HR', 'ค้นหาชื่อ',                    'rows', 'select * from public.employee where first_name_th ilike ''%ศิริ%'' or last_name_th ilike ''%ศิริ%''', '1'),
      ('HR', 'ลูกน้องของ E00014 (1:N)',      'rows', 'select e.* from public.employee e join public.employee m on m.id = e.manager_employee_id where m.employee_code = ''E00014''', '2'),
      ('HR', 'ดูประวัติการทำงาน',             'rows', 'select * from public.work_history where employee_id = (select id from public.employee where employee_code = ''E00017'')', '2'),
      ('HR', 'สิทธิ์ 6 รายการ',               'rows', 'select 1 where cardinality(public.my_permissions()) = 6 and not (''role.grant'' = any (public.my_permissions()))', '1'),
      ('HR', 'ดู audit_log',                 'rows', 'select 1 where exists (select 1 from public.audit_log)', '1'),

      -- HR: แก้ไข
      ('HR', 'แก้ชื่อ/ติดต่อ/ที่อยู่',          'exec', 'update public.employee set first_name_th = ''ภูมิ'', phone = ''089-111-1111'', province = ''ปทุมธานี'', postal_code = ''12000'' where employee_code = ''E00015''', '1'),
      ('HR', 'ย้ายแผนก/ตำแหน่ง/หัวหน้า',       'exec', 'update public.employee set department_id = (select id from public.department where code = ''IT''), position_id = (select id from public.position where code = ''DEV_SR''), manager_employee_id = (select id from public.employee where employee_code = ''E00016'') where employee_code = ''E00015''', '1'),
      ('HR', 'แก้ข้อมูลของตัวเอง',             'exec', 'update public.employee set phone = ''000'' where employee_code = ''E00010''', 'ERR:42501'),
      ('HR', 'ผูกบัญชีล็อกอิน (ต้องมี role.grant)', 'exec', 'update public.employee set auth_user_id = null where employee_code = ''E00015''', 'ERR:42501'),
      ('HR', 'รหัสไปรษณีย์ผิดรูปแบบ',          'exec', 'update public.employee set postal_code = ''1234'' where employee_code = ''E00015''', 'ERR:23514'),

      -- HR: สถานะ
      ('HR', 'เปลี่ยนเป็นลาออก',              'exec', 'update public.employee set employment_status = ''resigned'', resigned_date = current_date, status_reason = ''ย้ายภูมิลำเนา'' where employee_code = ''E00013''', '1'),
      ('HR', 'เปลี่ยนเป็นเสียชีวิต',           'exec', 'update public.employee set employment_status = ''deceased'', deceased_date = current_date, status_reason = ''อุบัติเหตุ'' where employee_code = ''E00013''', '1'),
      ('HR', 'ลาออกโดยไม่ระบุวันที่',          'exec', 'update public.employee set employment_status = ''resigned'', status_reason = ''x'' where employee_code = ''E00013''', 'ERR:23514'),
      ('HR', 'ลาออกโดยไม่ระบุเหตุผล',          'exec', 'update public.employee set employment_status = ''resigned'', resigned_date = current_date where employee_code = ''E00013''', 'ERR:P0001'),
      ('HR', 'วันลาออกก่อนวันเริ่มงาน',        'exec', 'update public.employee set employment_status = ''resigned'', resigned_date = ''2000-01-01'', status_reason = ''x'' where employee_code = ''E00013''', 'ERR:23514'),
      ('HR', 'คนลาออกกลับมาทำงาน (allow_rehire=false)', 'exec', 'update public.employee set employment_status = ''active'', resigned_date = null, status_reason = ''กลับมา'' where employee_code = ''E00017''', 'ERR:P0001'),

      -- HR: กติกาหัวหน้า
      ('HR', 'ตั้งตัวเองเป็นหัวหน้า',           'exec', 'update public.employee set manager_employee_id = id where employee_code = ''E00015''', 'ERR'),
      ('HR', 'สายบังคับบัญชาวน',              'exec', 'update public.employee set manager_employee_id = (select id from public.employee where employee_code = ''E00015'') where employee_code = ''E00014''', 'ERR:P0001'),
      ('HR', 'หัวหน้าเป็นคนที่ลาออกแล้ว',        'exec', 'update public.employee set manager_employee_id = (select id from public.employee where employee_code = ''E00017'') where employee_code = ''E00011''', 'ERR:P0001'),
      ('HR', 'เปลี่ยนหัวหน้าแผนก',             'exec', 'update public.department set head_employee_id = (select id from public.employee where employee_code = ''E00015'') where code = ''IT-DEV''', '1'),

      -- HR: เพิ่ม / ซ่อน / ลบ
      ('HR', 'เพิ่มพนักงานใหม่',               'exec', 'insert into public.employee (employee_code, first_name_th, last_name_th, email, hire_date, department_id, manager_employee_id) select ''E99901'', ''ทดสอบ'', ''ระบบ'', ''t01@welfare.test'', current_date, d.id, d.head_employee_id from public.department d where d.code = ''IT''', '1'),
      ('HR', 'อีเมลซ้ำ',                      'exec', 'insert into public.employee (employee_code, first_name_th, last_name_th, email, hire_date) values (''E99902'', ''ก'', ''ข'', ''DEMO.HR@welfare.test'', current_date)', 'ERR:23505'),
      ('HR', 'soft delete',                   'exec', 'update public.employee set deleted_at = now() where employee_code = ''E00016''', '1'),
      ('HR', 'ลบจริง',                        'exec', 'delete from public.employee where employee_code = ''E00016''', 'ERR:42501'),
      ('HR', 'แก้ประวัติการทำงานตรง',          'exec', 'update public.work_history set note = ''x''', 'ERR:42501'),
      ('HR', 'แก้ audit_log',                 'exec', 'update public.audit_log set action = ''INSERT''', 'ERR:42501'),

      -- HR: งานของ SUPER_ADMIN
      ('HR', 'มอบบทบาท',                      'exec', 'insert into public.user_role (employee_id, role_id) values ({E00015}, {ROLE:HR})', 'ERR:42501'),
      ('HR', 'ดูค่าตั้งค่า',                   'rows', 'select * from public.system_setting', '0'),
      ('HR', 'แก้ค่าตั้งค่า',                  'exec', 'update public.system_setting set value = ''true'' where key = ''allow_rehire''', '0'),
      ('HR', 'แก้สิทธิ์ของ role',              'exec', 'insert into public.role_permission (role_id, permission_id) values ({ROLE:FINANCE}, {PERM:employee.read})', 'ERR:42501'),

      -- SUPER_ADMIN
      ('SUPER_ADMIN', 'ดูพนักงานทั้งหมด',      'rows', 'select * from public.employee', '10'),
      ('SUPER_ADMIN', 'สิทธิ์ครบ 8 รายการ',     'rows', 'select 1 where cardinality(public.my_permissions()) = 8', '1'),
      ('SUPER_ADMIN', 'แก้ข้อมูลพนักงาน',       'exec', 'update public.employee set phone = ''089-222-2222'' where employee_code = ''E00011''', '1'),
      ('SUPER_ADMIN', 'แก้ข้อมูลของตัวเอง',      'exec', 'update public.employee set phone = ''000'' where employee_code = ''E00009''', 'ERR:42501'),
      ('SUPER_ADMIN', 'มอบบทบาท HR',           'exec', 'insert into public.user_role (employee_id, role_id) values ({E00015}, {ROLE:HR})', '1'),
      ('SUPER_ADMIN', 'มอบบทบาทซ้ำ',           'exec', 'insert into public.user_role (employee_id, role_id) values ({E00010}, {ROLE:HR})', 'ERR:23505'),
      ('SUPER_ADMIN', 'มอบบทบาทให้ตัวเอง',      'exec', 'insert into public.user_role (employee_id, role_id) values ({E00009}, {ROLE:HR})', 'ERR:42501'),
      ('SUPER_ADMIN', 'ยกเลิกบทบาท HR',         'exec', 'update public.user_role set revoked_at = now() where employee_id = (select id from public.employee where employee_code = ''E00011'') and role_id = (select id from public.app_role where code = ''HR'')', '1'),
      ('SUPER_ADMIN', 'แก้ตัวบุคคลใน user_role', 'exec', 'update public.user_role set employee_id = (select id from public.employee where employee_code = ''E00013'') where employee_id = (select id from public.employee where employee_code = ''E00011'') and revoked_at is null and role_id = (select id from public.app_role where code = ''HR'')', 'ERR:P0001'),
      ('SUPER_ADMIN', 'ลบ user_role',          'exec', 'delete from public.user_role', 'ERR:42501'),
      ('SUPER_ADMIN', 'ผูกบัญชีล็อกอิน',         'exec', 'update public.employee set auth_user_id = null where employee_code = ''E00015''', '1'),
      ('SUPER_ADMIN', 'แก้ค่าตั้งค่า',          'exec', 'update public.system_setting set value = ''true'' where key = ''allow_rehire''', '1'),
      ('SUPER_ADMIN', 'แก้ audit_log',         'exec', 'update public.audit_log set action = ''INSERT''', 'ERR:42501'),
      ('SUPER_ADMIN', 'ลบ audit_log',          'exec', 'delete from public.audit_log', 'ERR:42501')
    ) as v(who, label, kind, sql, expect)
  loop
    v_actual := null;
    v_sql := t.sql;
    for v_key in select jsonb_object_keys(v_ids) loop
      v_sql := replace(v_sql, '{' || v_key || '}', quote_literal(v_ids ->> v_key));
    end loop;
    begin
      if t.who = 'anon' then
        perform set_config('request.jwt.claims', '{"role":"anon"}', true);
        execute 'set local role anon';
      else
        perform set_config('request.jwt.claims',
          jsonb_build_object('sub', c_uid ->> t.who, 'role', 'authenticated')::text, true);
        execute 'set local role authenticated';
      end if;

      if t.kind = 'rows' then
        execute format('select count(*) from (%s) s', v_sql) into v_n;
      else
        execute v_sql;
        get diagnostics v_n = row_count;
      end if;
      v_actual := v_n::text;
      raise exception using errcode = 'TSTRB';  -- ย้อนการเปลี่ยนแปลงของข้อนี้
    exception
      when sqlstate 'TSTRB' then null;
      when others then v_actual := 'ERR:' || sqlstate || ' ' || sqlerrm;
    end;
    execute 'reset role';

    v_ok := v_actual = t.expect or (t.expect like 'ERR%' and v_actual like t.expect || '%');
    if v_ok then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
    v_lines := v_lines || format(E'\n%s [%s] %s: คาด %s ได้ %s',
                                 case when v_ok then 'PASS' else 'FAIL' end, t.who, t.label, t.expect, v_actual);
  end loop;


  -- ---------------------------------------------------------------------------
  -- ข้อทดสอบที่ต้องตรวจผลข้างเคียง (ดูผลด้วย postgres ภายใน subtransaction เดียวกัน)
  -- ---------------------------------------------------------------------------

  -- S1: audit_log บันทึกใครแก้ ค่าเดิม→ค่าใหม่ และแอปปลอม updated_by ไม่ได้
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', c_uid ->> 'HR', 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.employee
       set phone = '089-999-9999',
           updated_by = (select id from public.employee where employee_code = 'E00009')
     where id = v_emp7;
    execute 'reset role';

    select a.* into v_row from public.audit_log a
     where a.table_name = 'employee' and a.record_id = v_emp7::text
     order by a.id desc limit 1;

    v_ok := v_row.action = 'UPDATE'
        and v_row.changes = '{"phone": {"old": "081-000-0007", "new": "089-999-9999"}}'::jsonb
        and v_row.created_by = v_hr_id
        and v_row.related_employee_id = v_emp7
        and v_row.actor_roles = array['EMPLOYEE', 'HR']
        and v_row.actor_db_role = 'authenticated'
        and (select updated_by from public.employee where id = v_emp7) = v_hr_id;
    v_actual := format('action=%s changes=%s by_hr=%s roles=%s db_role=%s',
                       v_row.action, v_row.changes, v_row.created_by = v_hr_id, v_row.actor_roles, v_row.actor_db_role);
    raise exception using errcode = 'TSTRB';
  exception
    when sqlstate 'TSTRB' then null;
    when others then v_ok := false; v_actual := 'ERR:' || sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  if v_ok then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
  v_lines := v_lines || format(E'\n%s [HR] S1 audit_log ค่าเดิม→ค่าใหม่ ผู้แก้ และกันปลอม updated_by: %s',
                               case when v_ok then 'PASS' else 'FAIL' end, v_actual);

  -- S2: ย้ายแผนกแล้ว work_history ปิดช่วงเดิมและเปิดช่วงใหม่อัตโนมัติ
  begin
    perform set_config('request.jwt.claims', jsonb_build_object('sub', c_uid ->> 'HR', 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    update public.employee set department_id = (select id from public.department where code = 'IT') where id = v_emp5;
    execute 'reset role';

    select count(*) filter (where end_date is null) as open_rows,
           count(*) as all_rows,
           (array_agg(change_type order by effective_date desc, created_at desc))[1] as last_type
      into v_row
      from public.work_history where employee_id = v_emp5;
    v_ok := v_row.open_rows = 1 and v_row.all_rows = 2 and v_row.last_type = 'transfer';
    v_actual := format('ช่วงเปิด=%s ทั้งหมด=%s ล่าสุด=%s', v_row.open_rows, v_row.all_rows, v_row.last_type);
    raise exception using errcode = 'TSTRB';
  exception
    when sqlstate 'TSTRB' then null;
    when others then v_ok := false; v_actual := 'ERR:' || sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  if v_ok then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
  v_lines := v_lines || format(E'\n%s [HR] S2 work_history เมื่อย้ายแผนก: %s',
                               case when v_ok then 'PASS' else 'FAIL' end, v_actual);

  -- S3: โอนสิทธิ์ผ่านตาราง ถอด employee.update จาก HR แล้ว HR แก้ข้อมูลทั่วไปไม่ได้ แต่ยังเปลี่ยนสถานะได้
  begin
    delete from public.role_permission rp
     using public.app_role r, public.permission p
     where rp.role_id = r.id and rp.permission_id = p.id and r.code = 'HR' and p.code = 'employee.update';

    perform set_config('request.jwt.claims', jsonb_build_object('sub', c_uid ->> 'HR', 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    begin
      update public.employee set phone = '000' where id = v_emp7;
      v_actual := 'แก้เบอร์ได้ (ผิด)';
    exception when insufficient_privilege then
      v_actual := 'แก้เบอร์ไม่ได้';
    end;
    update public.employee
       set employment_status = 'resigned', resigned_date = current_date, status_reason = 'ทดสอบ'
     where id = v_emp5;
    get diagnostics v_n = row_count;
    execute 'reset role';

    v_ok := v_actual = 'แก้เบอร์ไม่ได้' and v_n = 1
        and exists (select 1 from public.audit_log where table_name = 'role_permission' and action = 'DELETE');
    v_actual := format('%s, เปลี่ยนสถานะได้ %s แถว, audit การถอดสิทธิ์=%s', v_actual, v_n,
                       exists (select 1 from public.audit_log where table_name = 'role_permission' and action = 'DELETE'));
    raise exception using errcode = 'TSTRB';
  exception
    when sqlstate 'TSTRB' then null;
    when others then v_ok := false; v_actual := 'ERR:' || sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  if v_ok then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
  v_lines := v_lines || format(E'\n%s [HR] S3 โอนสิทธิ์ผ่าน role_permission: %s',
                               case when v_ok then 'PASS' else 'FAIL' end, v_actual);

  -- S4: service_role ก็แก้/ลบ audit_log ไม่ได้
  begin
    execute 'set local role service_role';
    begin
      update public.audit_log set action = 'INSERT';
      v_actual := 'แก้ได้ (ผิด)';
    exception when others then
      v_actual := 'แก้ไม่ได้ (' || sqlstate || ')';
    end;
    begin
      delete from public.audit_log;
      v_actual := v_actual || ', ลบได้ (ผิด)';
    exception when others then
      v_actual := v_actual || ', ลบไม่ได้ (' || sqlstate || ')';
    end;
    execute 'reset role';
    v_ok := v_actual not like '%(ผิด)%';
    raise exception using errcode = 'TSTRB';
  exception
    when sqlstate 'TSTRB' then null;
    when others then v_ok := false; v_actual := 'ERR:' || sqlstate || ' ' || sqlerrm;
  end;
  execute 'reset role';
  if v_ok then v_pass := v_pass + 1; else v_fail := v_fail + 1; end if;
  v_lines := v_lines || format(E'\n%s [service_role] S4 audit_log: %s',
                               case when v_ok then 'PASS' else 'FAIL' end, v_actual);

  raise exception 'ROLLBACK passed=% failed=% %', v_pass, v_fail, v_lines;
end;
$test$;
