import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ระบบสวัสดิการพนักงาน", template: "%s · ระบบสวัสดิการพนักงาน" },
  description: "เข้าสู่ระบบเพื่อเบิกและติดตามสวัสดิการของคุณ",
  // ระบบภายใน: ห้าม index ทุกหน้า (ซ้ำกับ X-Robots-Tag ใน next.config เผื่อ header ถูกตัดโดย proxy)
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={plex.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
