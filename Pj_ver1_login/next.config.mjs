/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  experimental: {
    agentUpgrade: "security",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // ระบบภายใน: ไม่ให้ search engine เก็บหน้าใด ๆ (รวมถึงไฟล์ที่ไม่ใช่ HTML)
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          // บังคับ HTTPS – ใส่เฉพาะ production เพราะ localhost ใช้ http
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
