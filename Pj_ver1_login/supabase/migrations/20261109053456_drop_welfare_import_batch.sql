-- ลบตาราง welfare_import_batch ที่ยังไม่ได้ใช้งาน
-- เก็บคอลัมน์ welfare_claim.import_batch_id ไว้ เพราะ trigger guard_welfare_claim และ guard_welfare_claim_pay_round ยังอ่านค่านี้
do $$
begin
  if exists (select 1 from public.welfare_import_batch)
     or exists (select 1 from public.welfare_claim where import_batch_id is not null) then
    raise exception 'welfare_import_batch มีข้อมูลหรือมีคำขอเบิกอ้างถึง ยกเลิกการลบ';
  end if;
end;
$$;

alter table public.welfare_claim drop constraint welfare_claim_import_batch_id_fkey;

drop table public.welfare_import_batch;
