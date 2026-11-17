-- =============================================================================
-- ตั้งค่าเบิกล่วงหน้าในข้อเสนอสวัสดิการ (H04)
--   welfare_benefit_proposal.advance_receipt_days  กำหนดแนบใบเสร็จ (วัน) ที่เสนอ ใช้เมื่อ allow_advance = true
--   อนุมัติแล้วคัดลอกไป welfare_benefit.advance_receipt_days (null = ใช้ค่ากลางของระบบ 30 วัน)
-- =============================================================================

alter table public.welfare_benefit_proposal
  add column advance_receipt_days integer check (advance_receipt_days is null or advance_receipt_days between 1 and 365);

comment on column public.welfare_benefit_proposal.advance_receipt_days is 'ต้องแนบใบเสร็จภายในกี่วันหลังได้รับเงินล่วงหน้า (null = ค่ากลางของระบบ)';
