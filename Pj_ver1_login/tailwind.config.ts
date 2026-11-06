import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#18253F", soft: "#33415C", mute: "#6B778C" },
        paper: "#F6F7F9",
        slip: "#FFFFFF",
        mist: "#E6EBF3",
        stamp: { DEFAULT: "#D99A1E", dark: "#9A6A0A" },
        ok: "#1F7A55",
        danger: "#B3261E",
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#1d4ed8",
          700: "#1e40af",
        },
        surface: "#f8fafc",
        line: "#e2e8f0",
        // ≥4.5:1 บน paper / surface / primary-50 (เดิม #64748b ได้แค่ 4.44:1 บน paper)
        muted: "#5b6b82",
        status: {
          draft: "#64748b",
          pending: "#d97706",
          "pending-soft": "#fef3c7",
          "pending-ink": "#92400e",
          approved: "#16a34a",
          "approved-soft": "#dcfce7",
          "approved-ink": "#166534",
          rejected: "#dc2626",
          "rejected-soft": "#fee2e2",
          "rejected-ink": "#991b1b",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06)",
        popover: "0 8px 24px -6px rgba(15, 23, 42, 0.18)",
      },
      // ขนาดตัวอักษรเป็น rem เทียบกับ root 14px (html = 0.875rem) – เช่น text-13 = 13px ที่ค่าเริ่มต้น
      // แต่จะขยายตามขนาดตัวอักษรที่ผู้ใช้ตั้งไว้ในเบราว์เซอร์
      fontSize: Object.fromEntries(
        [10, 11, 12, 13, 14, 15, 16, 17, 18, 22, 24].map((px) => [String(px), `calc(${px}rem / 14)`]),
      ),
      fontFamily: {
        sans: ["var(--font-plex-thai)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "skeleton-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        // หน่วง 200ms ก่อนค่อยๆ แสดง skeleton
        "skeleton-in": "skeleton-in 200ms ease-out 200ms both",
      },
    },
  },
  plugins: [],
};

export default config;
