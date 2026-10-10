/**
 * จำกัดการเข้าใช้งานเฉพาะเครือข่ายที่ทำงาน (รองรับ IPv4 และ CIDR)
 * ใช้ได้ทั้ง Edge (middleware) และ Node runtime
 */

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function matchesRule(ip: number, rule: string): boolean {
  const [base, bitsStr] = rule.trim().split("/");
  const baseInt = ipv4ToInt(base);
  if (baseInt === null) return false;
  const bits = bitsStr === undefined ? 32 : Number(bitsStr);
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false;
  if (bits === 0) return true;
  const block = 2 ** (32 - bits);
  return Math.floor(ip / block) === Math.floor(baseInt / block);
}

export function normalizeIp(raw: string): string {
  let ip = raw.trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7); // IPv4-mapped IPv6
  return ip;
}

export function isOfficeNetwork(rawIp: string | null): boolean {
  if (process.env.ENFORCE_OFFICE_NETWORK !== "true") return true;
  if (!rawIp) return false;

  const ip = normalizeIp(rawIp);

  // อนุญาต localhost เฉพาะตอนพัฒนา
  if (process.env.NODE_ENV !== "production" && (ip === "::1" || ip === "127.0.0.1")) {
    return true;
  }

  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;

  const rules = (process.env.OFFICE_ALLOWED_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return rules.some((rule) => matchesRule(ipInt, rule));
}

/**
 * อ่าน IP ของผู้ใช้จาก header ที่ reverse proxy ส่งมา
 * หมายเหตุ: ใช้ได้ปลอดภัยเมื่อ proxy (Nginx / Load Balancer) เป็นผู้ตั้งค่า
 * x-forwarded-for เองเท่านั้น และไม่ให้ client ส่งค่าเข้ามาตรงๆ
 */
export function getClientIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip");
}
