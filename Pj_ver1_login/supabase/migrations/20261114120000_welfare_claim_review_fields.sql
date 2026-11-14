-- =============================================================================
-- ข้อมูลที่หน้าตรวจคำขอของ HR ต้องใช้ (รีดีไซน์ HR ข้อ 3 / ดีไซน์ H02, R04, R06)
--   welfare_claim.proxy_reason       เหตุผลที่หัวหน้าแผนกยื่นแทน (ตอนนี้ซ่อนอยู่ต้น note: "ยื่นแทนเพราะ …")
--   welfare_claim.beneficiary_*      ผู้รับสิทธิ์ (ตัวเอง / คู่สมรส / บุตร / บิดามารดา)
--   welfare_claim.total_cost         ค่าใช้จ่ายทั้งหมด
--   welfare_claim.insurance_paid     ยอดที่ประกันจ่ายแล้ว (เบิกส่วนเกินจากประกัน)
--   welfare_claim_attachment.doc_kind ประเภทเอกสาร ใบรับรองแพทย์ = เอกสารจำกัดสิทธิ์ (เจ้าของกับ HR เท่านั้น)
-- =============================================================================


-- -----------------------------------------------------------------------------
-- คำขอ
-- -----------------------------------------------------------------------------

alter table public.welfare_claim
  add column proxy_reason          text,
  add column beneficiary_relation  text not null default 'self'
                                   check (beneficiary_relation in ('self', 'spouse', 'child', 'parent')),
  add column beneficiary_name      text,
  add column total_cost            numeric(12, 2) check (total_cost is null or total_cost > 0),
  add column insurance_paid        numeric(12, 2) check (insurance_paid is null or insurance_paid >= 0),
  add column insurer_name          text;

comment on column public.welfare_claim.proxy_reason is 'เหตุผลที่ยื่นแทน (มีเมื่อ submitted_by ต่างจาก employee_id)';
comment on column public.welfare_claim.beneficiary_relation is 'ผู้รับสิทธิ์: self=ตัวเอง, spouse=คู่สมรส, child=บุตร, parent=บิดามารดา';
comment on column public.welfare_claim.beneficiary_name is 'ชื่อผู้รับสิทธิ์ เมื่อไม่ใช่ตัวพนักงาน';
comment on column public.welfare_claim.total_cost is 'ค่าใช้จ่ายทั้งหมดตามใบเสร็จ';
comment on column public.welfare_claim.insurance_paid is 'ยอดที่ประกันจ่ายแล้ว ยอดขอเบิกต้องไม่เกิน total_cost - insurance_paid';
comment on column public.welfare_claim.insurer_name is 'ชื่อประกัน เช่น ประกันกลุ่ม';

-- ย้ายเหตุผลยื่นแทนที่เก็บไว้ต้น note มาไว้คอลัมน์ใหม่ (note เดิมไม่แก้)
update public.welfare_claim
set proxy_reason = btrim(substring(note from '^ยื่นแทนเพราะ ([^·]+?)(?: · |$)'))
where submitted_by <> employee_id
  and proxy_reason is null
  and note ~ '^ยื่นแทนเพราะ ';

-- กติกาใหม่ใช้กับคำขอที่ยื่นหลังจากนี้ (not valid = ไม่ตรวจแถวเก่าที่อาจไม่มีเหตุผล)
alter table public.welfare_claim
  add constraint welfare_claim_proxy_reason_check
  check (submitted_by = employee_id or status in ('draft', 'cancelled') or length(btrim(coalesce(proxy_reason, ''))) > 0) not valid;

alter table public.welfare_claim
  add constraint welfare_claim_beneficiary_check
  check (beneficiary_relation = 'self' or length(btrim(coalesce(beneficiary_name, ''))) > 0) not valid;

alter table public.welfare_claim
  add constraint welfare_claim_insurance_check
  check (
    insurance_paid is null
    or (total_cost is not null and insurance_paid <= total_cost
        and (amount_requested is null or amount_requested <= total_cost - insurance_paid))
  );


-- -----------------------------------------------------------------------------
-- ประเภทเอกสารแนบ
-- -----------------------------------------------------------------------------

alter table public.welfare_claim_attachment
  add column doc_kind text not null default 'other'
    check (doc_kind in ('receipt', 'medical_certificate', 'insurance_claim', 'certificate', 'other')),
  add column is_restricted boolean generated always as (doc_kind = 'medical_certificate') stored;

comment on column public.welfare_claim_attachment.doc_kind is 'ประเภทเอกสาร: receipt=ใบเสร็จ, medical_certificate=ใบรับรองแพทย์, insurance_claim=ใบแจ้งผลสินไหม, certificate=ใบประกาศนียบัตร';
comment on column public.welfare_claim_attachment.is_restricted is 'true = เห็นเฉพาะเจ้าของคำขอกับ HR (การเงินและหัวหน้าแผนกเปิดไม่ได้)';

-- ใส่ประเภทให้ไฟล์เดิมจากชื่อไฟล์ (เดาได้เท่านี้ ที่เหลือเป็น other)
update public.welfare_claim_attachment
set doc_kind = case
  when file_name ~* '(ใบรับรองแพทย์|medical|med[-_ ]?cert)' then 'medical_certificate'
  when file_name ~* '(สินไหม|insurance|claim[-_ ]?form)' then 'insurance_claim'
  when file_name ~* '(ใบเสร็จ|receipt|invoice)' then 'receipt'
  when file_name ~* '(ประกาศนียบัตร|certificate)' then 'certificate'
  else 'other'
end
where doc_kind = 'other';
