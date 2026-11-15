// ใช้ได้ทั้งฝั่งเซิร์ฟเวอร์ (อ่าน ?tab=) และใน HomeTabs ฝั่งไคลเอนต์
export const HOME_TABS = [
  { id: "benefits", label: "สิทธิ์สวัสดิการ" },
  { id: "requests", label: "คำขอของฉัน" },
  { id: "profile", label: "ข้อมูลส่วนตัว" },
] as const;
export type HomeTabId = (typeof HOME_TABS)[number]["id"];

export const isHomeTab = (value: unknown): value is HomeTabId => HOME_TABS.some((tab) => tab.id === value);
