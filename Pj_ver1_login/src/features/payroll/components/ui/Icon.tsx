// ไอคอนแบบเส้น (SVG) ใช้ทั้งระบบ ไม่ต้องติดตั้งไลบรารีเพิ่ม
// ใช้:  <Icon name="search" className="size-5" />
// สีของไอคอนตามสีตัวอักษรรอบๆ (stroke="currentColor")

const PATHS = {
  menu: "M4 6h16M4 12h16M4 18h16",
  calendar: "M8 3v3M16 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  fileText: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5M9 13h6M9 17h6M9 9h2",
  spreadsheet: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM9 8h6M9 12h6M9 16h6",
  history: "M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5M12 7v5l3 2",
  logout: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h10",
  search: "m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z",
  bell: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9Zm4.3 13a2 2 0 0 0 3.4 0",
  chevronDown: "m6 9 6 6 6-6",
  chevronLeft: "m15 18-6-6 6-6",
  chevronRight: "m9 18 6-6-6-6",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  x: "M18 6 6 18M6 6l12 12",
  check: "m5 12 5 5L20 7",
  inbox: "M22 12h-6l-2 3h-4l-2-3H2m20 0v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6m20 0-3.5-7h-13L2 12",
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
} as const;

export type IconKey = keyof typeof PATHS;

export function Icon({ name, className = "size-5", strokeWidth = 1.75 }: { name: IconKey; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
