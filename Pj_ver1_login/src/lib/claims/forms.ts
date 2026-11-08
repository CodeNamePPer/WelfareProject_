// แบบฟอร์มยื่นเบิกตามชนิดสวัสดิการ (welfare_benefit.form_type) ใช้ร่วมกันทั้งยื่นเองและหัวหน้ายื่นแทน

export type BenefitField = {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea" | "select";
  placeholder?: string;
  options?: string[];
  wide?: boolean;
  optional?: boolean;
};

const AMOUNT: BenefitField = { key: "amount", label: "จำนวนเงินที่ขอเบิก", type: "number" };
const CHILD_RELATION: BenefitField = { key: "relationship", label: "ความสัมพันธ์กับพนักงาน", type: "select", options: ["บุตรโดยชอบด้วยกฎหมาย", "บุตรบุญธรรม"] };

export const FORM_FIELDS: Record<string, BenefitField[]> = {
  general: [
    { key: "hospital", label: "ผู้ให้บริการ / ร้านค้า", type: "text", placeholder: "ระบุชื่อผู้ให้บริการหรือร้านค้า" },
    { key: "serviceDate", label: "วันที่เกิดค่าใช้จ่าย", type: "date" },
    { key: "itemDetail", label: "รายละเอียดค่าใช้จ่าย", type: "textarea", placeholder: "ระบุรายการที่ขอเบิก", wide: true },
    AMOUNT,
  ],
  medical: [
    { key: "patientName", label: "ชื่อผู้เข้ารับการรักษา", type: "text", placeholder: "ระบุชื่อผู้ป่วย" },
    { key: "hospital", label: "ชื่อสถานพยาบาล / คลินิก", type: "text", placeholder: "ระบุชื่อสถานพยาบาล" },
    { key: "serviceDate", label: "วันที่เข้ารับการรักษา", type: "date" },
    { key: "diagnosis", label: "อาการหรือรายละเอียดการรักษา", type: "textarea", placeholder: "ระบุอาการ การวินิจฉัย หรือรายละเอียดการรักษา", wide: true },
    AMOUNT,
  ],
  dental: [
    { key: "patientName", label: "ชื่อผู้เข้ารับบริการ", type: "text", placeholder: "ระบุชื่อผู้เข้ารับบริการ" },
    { key: "clinic", label: "ชื่อคลินิก / ทันตแพทย์", type: "text", placeholder: "ระบุชื่อคลินิกหรือทันตแพทย์" },
    { key: "serviceDate", label: "วันที่เข้ารับบริการ", type: "date" },
    { key: "treatmentType", label: "ประเภทการรักษา", type: "select", options: ["ขูดหินปูน", "อุดฟัน", "ถอนฟัน", "รักษารากฟัน", "จัดฟัน", "อื่น ๆ"] },
    { key: "toothArea", label: "ตำแหน่ง / ซี่ฟันที่รักษา", type: "text", placeholder: "เช่น ฟันกรามซี่ที่ 36" },
    AMOUNT,
  ],
  checkup: [
    { key: "facility", label: "สถานพยาบาลที่ตรวจ", type: "text", placeholder: "ระบุชื่อโรงพยาบาลหรือคลินิก" },
    { key: "packageName", label: "ชื่อโปรแกรมตรวจสุขภาพ", type: "text", placeholder: "ระบุแพ็กเกจหรือรายการตรวจ" },
    { key: "checkupDate", label: "วันที่เข้ารับการตรวจ", type: "date" },
    { key: "checkupType", label: "รูปแบบการตรวจ", type: "select", options: ["ตรวจสุขภาพประจำปี", "ตรวจตามความเสี่ยงของงาน", "ตรวจเพิ่มเติมตามแพทย์แนะนำ"] },
    { ...AMOUNT, label: "ค่าใช้จ่ายตามใบเสร็จ" },
  ],
  training: [
    { key: "courseName", label: "ชื่อหลักสูตร", type: "text", placeholder: "ระบุชื่อหลักสูตรอบรม" },
    { key: "institution", label: "สถาบัน / ผู้จัดอบรม", type: "text", placeholder: "ระบุชื่อหน่วยงานผู้จัด" },
    { key: "courseFormat", label: "รูปแบบการอบรม", type: "select", options: ["อบรมในสถานที่", "อบรมออนไลน์", "อบรมแบบผสมผสาน"] },
    { key: "courseDate", label: "วันที่เริ่มอบรม", type: "date" },
    { key: "registrationType", label: "ประเภทค่าใช้จ่าย", type: "select", options: ["ค่าลงทะเบียน", "ค่าธรรมเนียมหลักสูตร", "ค่าอบรมและเอกสารประกอบ"] },
    { ...AMOUNT, label: "ค่าลงทะเบียนที่ขอเบิก" },
  ],
  child_medical: [
    { key: "childName", label: "ชื่อบุตรผู้เข้ารับการรักษา", type: "text", placeholder: "ระบุชื่อ-นามสกุลบุตร" },
    CHILD_RELATION,
    { key: "hospital", label: "ชื่อสถานพยาบาล / คลินิก", type: "text", placeholder: "ระบุชื่อสถานพยาบาล" },
    { key: "serviceDate", label: "วันที่เข้ารับการรักษา", type: "date" },
    { key: "treatmentDetail", label: "อาการหรือรายละเอียดการรักษา", type: "textarea", placeholder: "ระบุอาการและการรักษาของบุตร", wide: true },
    AMOUNT,
  ],
  child_vaccine: [
    { key: "childName", label: "ชื่อบุตรผู้รับวัคซีน", type: "text", placeholder: "ระบุชื่อ-นามสกุลบุตร" },
    CHILD_RELATION,
    { key: "vaccineName", label: "ชื่อวัคซีน", type: "text", placeholder: "เช่น วัคซีนไข้หวัดใหญ่" },
    { key: "doseNumber", label: "ครั้งที่ / เข็มที่", type: "select", options: ["เข็มที่ 1", "เข็มที่ 2", "เข็มที่ 3", "เข็มกระตุ้น", "ไม่ระบุ"] },
    { key: "injectionDate", label: "วันที่รับวัคซีน", type: "date" },
    { key: "clinic", label: "สถานพยาบาลที่ให้วัคซีน", type: "text", placeholder: "ระบุชื่อโรงพยาบาลหรือคลินิก" },
    { ...AMOUNT, label: "ค่าใช้จ่ายที่ขอเบิก" },
  ],
};

export function fieldsFor(formType: string | null | undefined): BenefitField[] {
  return FORM_FIELDS[formType ?? "general"] ?? FORM_FIELDS.general;
}

const DATE_KEYS = ["serviceDate", "checkupDate", "courseDate", "injectionDate"];
const PROVIDER_KEYS = ["hospital", "clinic", "facility", "institution"];

export type ClaimFormPayload = { amount: number; expenseDate: string; providerName: string; details: Record<string, string> };

/** แยกค่าจากแบบฟอร์มเป็นคอลัมน์หลัก ส่วนที่เหลือเก็บใน details โดยใช้ชื่อช่องเป็นคีย์ */
export function toClaimPayload(formType: string | null | undefined, values: Record<string, string>): ClaimFormPayload {
  const fields = fieldsFor(formType);
  const details: Record<string, string> = {};
  for (const field of fields) {
    if (field.key === "amount" || DATE_KEYS.includes(field.key) || PROVIDER_KEYS.includes(field.key)) continue;
    const value = values[field.key]?.trim();
    if (value) details[field.label] = value;
  }
  return {
    amount: Number(values.amount) || 0,
    expenseDate: DATE_KEYS.map((key) => values[key]).find(Boolean) ?? "",
    providerName: (PROVIDER_KEYS.map((key) => values[key]?.trim()).find(Boolean) ?? values.courseName?.trim()) || "",
    details,
  };
}

/** แปลงค่าที่บันทึกไว้กลับเป็นค่าของแบบฟอร์ม เมื่อแก้ไขฉบับร่างหรือยื่นใหม่ */
export function toFormValues(
  formType: string | null | undefined,
  claim: { amountRequested: number; expenseDate: string | null; providerName: string | null; details: Record<string, string> },
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fieldsFor(formType)) {
    if (field.key === "amount") values.amount = claim.amountRequested ? String(claim.amountRequested) : "";
    else if (DATE_KEYS.includes(field.key)) values[field.key] = claim.expenseDate ?? "";
    else if (PROVIDER_KEYS.includes(field.key)) values[field.key] = claim.providerName ?? "";
    else values[field.key] = claim.details[field.label] ?? "";
  }
  return values;
}

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const ALLOWED_ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"];
