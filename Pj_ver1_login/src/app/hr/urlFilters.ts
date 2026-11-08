// ตัวกรองที่ใช้ร่วมกันระหว่างหน้าคำขอ (q = ค้นหา, dept = แผนก, type = ประเภทคำขอ, view = มุมมองในคิว)
// เก็บไว้ใน URL เพื่อให้คงอยู่เมื่อสลับแท็บ กดย้อนกลับ หรือส่งลิงก์ให้คนอื่น

/** มุมมองเฉพาะของคิว: เฉพาะที่รอเกินกำหนด หรือเฉพาะที่ต้องตรวจสอบก่อน */
export type QueueView = "" | "overdue" | "blocked";

export type RequestFilters = { q: string; dept: string; type: string; view: QueueView };

export const ALL = "ทั้งหมด";

type Params = Record<string, string | string[] | undefined>;

function pick(params: Params, key: string, fallback: string) {
  const value = params[key];
  return typeof value === "string" && value !== "" ? value : fallback;
}

export function readRequestFilters(params: Params): RequestFilters {
  const view = pick(params, "view", "");
  return {
    q: pick(params, "q", ""),
    dept: pick(params, "dept", ALL),
    type: pick(params, "type", ALL),
    view: view === "overdue" || view === "blocked" ? view : "",
  };
}

/** includeView = false สำหรับลิงก์ไปหน้าอื่น (มุมมองมีความหมายเฉพาะในคิวรอตรวจ) */
export function filtersToQuery(filters: Partial<RequestFilters> & Omit<RequestFilters, "view">, includeView = true): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.dept !== ALL) params.set("dept", filters.dept);
  if (filters.type !== ALL) params.set("type", filters.type);
  if (includeView && filters.view) params.set("view", filters.view);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** อัปเดต URL โดยไม่โหลดหน้าใหม่และไม่เพิ่มประวัติทุกครั้งที่พิมพ์ */
export function replaceUrlQuery(query: string) {
  window.history.replaceState(null, "", `${window.location.pathname}${query}`);
}
