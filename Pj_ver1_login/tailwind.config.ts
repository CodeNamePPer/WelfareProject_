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
        muted: "#64748b",
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
      },
      fontFamily: {
        sans: ["var(--font-plex-thai)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
