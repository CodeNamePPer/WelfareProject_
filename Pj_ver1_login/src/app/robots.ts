import type { MetadataRoute } from "next";

// ระบบภายในบริษัท (ต้องล็อกอิน) – ไม่ให้ search engine / AI crawler เก็บหน้าใดเลย
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
