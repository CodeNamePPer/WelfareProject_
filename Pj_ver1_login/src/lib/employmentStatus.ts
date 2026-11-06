// ชื่อสถานะพนักงานชุดเดียว ใช้ทุกหน้าใน /admin (หน้าแรก, ผู้ใช้, โปรไฟล์)
// เดิมแต่ละหน้าเรียกต่างกัน ("ใช้งานอยู่" / "ทำงานอยู่", "พ้นสภาพ" / "ลาออก") ทำให้ตัวเลขดูไม่ตรงกัน
export const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "ทำงานอยู่",
  RESIGNED: "ลาออก",
  DECEASED: "เสียชีวิต",
};

export const employmentStatusLabel = (status: string) => EMPLOYMENT_STATUS_LABELS[status] ?? status;
