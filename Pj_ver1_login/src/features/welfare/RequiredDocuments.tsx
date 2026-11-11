// รายการเอกสารที่ต้องแนบของสวัสดิการหนึ่งรายการ ใช้ร่วมกันทั้งฟอร์มยื่นเองและหัวหน้ายื่นแทน
// ใบเสร็จต้องมีทุกคำขอ ส่วนที่เหลือมาจาก welfare_benefit.required_documents

export function RequiredDocuments({ documents }: { documents: string[] }) {
  return (
    <ol className="list-decimal space-y-1.5 pl-5 text-left text-13 leading-6 text-ink-soft">
      <li>
        ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน
        <span className="block text-12 text-muted">ต้องเห็นเลขที่ใบเสร็จ วันที่ และยอดเงินชัดเจน</span>
      </li>
      {documents.map((document) => (
        <li key={document}>{document}</li>
      ))}
    </ol>
  );
}

export const ATTACHMENT_RULE = 'แนบเป็นไฟล์ PDF, JPG หรือ PNG ขนาดไม่เกิน 10 MB ต่อไฟล์';
