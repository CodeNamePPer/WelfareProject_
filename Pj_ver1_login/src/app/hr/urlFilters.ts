// ตัวกรองที่ใช้ร่วมกันระหว่างหน้าคำขอ (q = ค้นหา, dept = แผนก, type = ประเภทคำขอ)
// เก็บไว้ใน URL เพื่อให้คงอยู่เมื่อสลับแท็บ กดย้อนกลับ หรือส่งลิงก์ให้คนอื่น

export type RequestFilters = { q: string; dept: string; type: string };

export const ALL = "ทั้งหมด";

type Params = Record<string, string | string[] | undefined>;

function pick(params: Params, key: string, fallback: string) {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : fallback;
}

export function readRequestFilters(params: Params): RequestFilters {
  return { q: pick(params, "q", ""), dept: pick(params, "dept", ALL), type: pick(params, "type", ALL) };
}

export function filtersToQuery(filters: RequestFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.dept !== ALL) params.set("dept", filters.dept);
  if (filters.type !== ALL) params.set("type", filters.type);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** อัปเดต URL โดยไม่โหลดหน้าใหม่และไม่เพิ่มประวัติทุกครั้งที่พิมพ์ */
export function replaceUrlQuery(query: string) {
  window.history.replaceState(null, "", `${window.location.pathname}${query}`);
}
