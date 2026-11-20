// แบบฟอร์มยื่นเบิกตามชนิดสวัสดิการ (welfare_benefit.form_type) ใช้ร่วมกันทั้งยื่นเองและหัวหน้ายื่นแทน

export type BenefitField = {
  key: string;
  label: string;
  type: "text" | "date" | "number" | "textarea" | "select" | "radio";
  placeholder?: string;
  options?: string[];
  wide?: boolean;
  optional?: boolean;
  /** แสดงและบังคับกรอกเฉพาะเมื่อช่อง key มีค่าเท่ากับ equals */
  when?: { key: string; equals: string };
  /** ระบบเติมค่าให้ ผู้ยื่นแก้ไม่ได้ */
  readOnly?: boolean;
  /** ตรวจรูปแบบค่าเพิ่ม เช่น รหัสไปรษณีย์ */
  pattern?: { regex: RegExp; message: string };
};

const AMOUNT: BenefitField = { key: "amount", label: "จำนวนเงินที่ขอเบิก", type: "number" };
const CHILD_RELATION: BenefitField = { key: "relationship", label: "ความสัมพันธ์กับพนักงาน", type: "select", options: ["บุตรโดยชอบด้วยกฎหมาย", "บุตรบุญธรรม"] };

/** สวัสดิการภัยพิบัติ: พนักงานเลือกระดับผลกระทบเอง ยอดเบิกตายตัวตามระดับ HR ตรวจกับรูปหลักฐาน */
export const FLOOD_LEVELS = [
  { label: "ระดับ 1 · ผลกระทบเล็กน้อย ความเสียหายรอบที่พักอาศัย", amount: 3000 },
  { label: "ระดับ 2 · ผลกระทบปานกลาง ความเสียหายเข้าภายในที่พักอาศัย", amount: 5000 },
  { label: "ระดับ 3 · ผลกระทบรุนแรง พักอาศัยไม่ได้ชั่วคราว", amount: 10000 },
];
export const ADDRESS_SYSTEM = "ตรงกับที่อยู่ในระบบ";
export const ADDRESS_OTHER = "ไม่ตรงกับที่อยู่ในระบบ";
const OTHER_ADDRESS = { key: "addressSource", equals: ADDRESS_OTHER };
export const FLOOD_LEVEL_LABEL = "ระดับผลกระทบ";
/** หมวดที่สร้างสวัสดิการแบบฟอร์มภัยพิบัติได้ (หน้าเสนอ/สร้างสวัสดิการของ HR) */
export const DISASTER_CATEGORY = "ภัยพิบัติ";
/** ยอดสูงสุดของแบบฟอร์มภัยพิบัติ (ระดับ 3) วงเงินของสวัสดิการต้องไม่ต่ำกว่านี้ */
export const FLOOD_MAX_AMOUNT = Math.max(...FLOOD_LEVELS.map((level) => level.amount));

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
  flood: [
    { key: "floodDate", label: "วันที่เกิดภัยพิบัติ", type: "date" },
    { key: "addressSource", label: "ที่อยู่ที่ได้รับผลกระทบ", type: "radio", options: [ADDRESS_SYSTEM, ADDRESS_OTHER], wide: true },
    { key: "systemAddress", label: "ที่อยู่ในระบบ", type: "text", readOnly: true, wide: true, when: { key: "addressSource", equals: ADDRESS_SYSTEM } },
    { key: "addressLine", label: "บ้านเลขที่ / หมู่ / ถนน", type: "text", placeholder: "เช่น 99/1 หมู่ 3 ถนนพหลโยธิน", wide: true, when: OTHER_ADDRESS },
    { key: "subdistrict", label: "ตำบล / แขวง", type: "text", when: OTHER_ADDRESS },
    { key: "district", label: "อำเภอ / เขต", type: "text", when: OTHER_ADDRESS },
    { key: "province", label: "จังหวัด", type: "text", when: OTHER_ADDRESS },
    { key: "postalCode", label: "รหัสไปรษณีย์", type: "text", placeholder: "5 หลัก", when: OTHER_ADDRESS, pattern: { regex: /^\d{5}$/, message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" } },
    { key: "floodStatus", label: "สถานะ ณ วันที่ยื่น", type: "radio", options: ["ยังได้รับผลกระทบอยู่", "สถานการณ์คลี่คลายแล้ว"], wide: true },
    { key: "impactLevel", label: FLOOD_LEVEL_LABEL, type: "radio", options: FLOOD_LEVELS.map((level) => level.label), wide: true },
    { key: "damageDetail", label: "รายละเอียดความเสียหาย", type: "textarea", placeholder: "เช่น ลักษณะความเสียหาย ทรัพย์สินที่เสียหาย", wide: true, optional: true },
    AMOUNT,
  ],
};

/** ชุดแบบฟอร์มที่ไม่มีใบเสร็จ (จ่ายตามเกณฑ์) ยังต้องแนบเอกสารหลักฐานอย่างน้อย 1 ไฟล์ */
const NO_RECEIPT_FORM_TYPES = ["flood"];

export function needsReceipt(formType: string | null | undefined): boolean {
  return !NO_RECEIPT_FORM_TYPES.includes(formType ?? "general");
}

/** ยอดเบิกที่ระบบกำหนดจากตัวเลือก (null = ผู้ยื่นกรอกเอง) */
export function fixedAmount(formType: string | null | undefined, values: Record<string, string>): number | null {
  if (formType !== "flood") return null;
  return FLOOD_LEVELS.find((level) => level.label === values.impactLevel)?.amount ?? 0;
}

export function isFieldActive(field: BenefitField, values: Record<string, string>): boolean {
  return !field.when || values[field.when.key] === field.when.equals;
}

/** ชื่อชุดแบบฟอร์มที่ Admin เลือกให้แต่ละสวัสดิการ */
export const FORM_TYPE_LABELS: Record<string, string> = {
  general: "ทั่วไป",
  medical: "ค่ารักษาพยาบาล",
  dental: "ทันตกรรม",
  checkup: "ตรวจสุขภาพ",
  training: "อบรม",
  child_medical: "ค่ารักษาพยาบาลบุตร",
  child_vaccine: "วัคซีนบุตร",
  flood: "ภัยพิบัติ (ระดับผลกระทบ)",
};

/** ทุกคำขอเดินเส้นทางเดียวกัน ตาม RULES ใน service.ts */
export const APPROVAL_FLOW = "HR ตรวจสอบ แล้วส่งต่อการเงินจ่ายเงิน";

/** ข้อความจำนวนครั้งที่เบิกได้ ตัวเลขนับต่อปีของวันที่เกิดค่าใช้จ่ายและระบบบังคับ ข้อความเป็นเงื่อนไขประกอบ */
export function maxClaimsLabel(maxClaims: number | null, note: string | null): string {
  return maxClaims !== null ? `${maxClaims} ครั้ง/ปี` : (note ?? "");
}

export function fieldsFor(formType: string | null | undefined): BenefitField[] {
  return FORM_FIELDS[formType ?? "general"] ?? FORM_FIELDS.general;
}

const DATE_KEYS = ["serviceDate", "checkupDate", "courseDate", "injectionDate", "floodDate"];
const PROVIDER_KEYS = ["hospital", "clinic", "facility", "institution"];

export type ClaimFormPayload = { amount: number; expenseDate: string; providerName: string; details: Record<string, string> };

/** แยกค่าจากแบบฟอร์มเป็นคอลัมน์หลัก ส่วนที่เหลือเก็บใน details โดยใช้ชื่อช่องเป็นคีย์ */
export function toClaimPayload(formType: string | null | undefined, values: Record<string, string>): ClaimFormPayload {
  const fields = fieldsFor(formType);
  const details: Record<string, string> = {};
  for (const field of fields) {
    if (field.key === "amount" || DATE_KEYS.includes(field.key) || PROVIDER_KEYS.includes(field.key) || !isFieldActive(field, values)) continue;
    const value = values[field.key]?.trim();
    if (value) details[field.label] = value;
  }
  return {
    amount: fixedAmount(formType, values) ?? (Number(values.amount) || 0),
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
