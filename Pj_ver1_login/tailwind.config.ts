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
      },
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
