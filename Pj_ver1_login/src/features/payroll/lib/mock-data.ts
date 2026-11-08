// ข้อมูลตัวอย่าง (mock) สำหรับแสดงหน้าจอ ก่อนต่อกับ API/ฐานข้อมูลจริง
// สร้างแบบ "สุ่มที่ได้ผลเหมือนเดิมทุกครั้ง" (seeded random) เพื่อไม่ให้ server กับ browser ได้ข้อมูลคนละชุด
// เมื่อต่อ backend จริง ให้แทนที่ฟังก์ชันในไฟล์นี้ด้วยการเรียก API แล้ว return ข้อมูลชนิดเดียวกัน

import { DEFAULT_PAY_SETTINGS, resolvePayDate } from "./pay-settings";
import type { PaymentRequest, PayRound, PaymentStatus, RoundNo, WelfareType } from "./types";

/** วันอ้างอิงของข้อมูลตัวอย่าง: รายการที่กำหนดจ่ายก่อนวันนี้ถือว่า "จ่ายแล้ว" */
export const MOCK_TODAY = "2026-11-04";

/** ตัวสุ่มแบบกำหนด seed (mulberry32) – ได้ลำดับตัวเลขเดิมทุกครั้ง */
function createRandom(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EMPLOYEES = [
  { name: "นาย สมชาย ใจดี", dept: "ฝ่ายทรัพยากรบุคคล" },
  { name: "นางสาว สมหญิง รักงาน", dept: "ฝ่ายบัญชี" },
  { name: "นาย วิชัย พัฒนา", dept: "ฝ่ายการตลาด" },
  { name: "นางสาว สุดารัตน์ มีสุข", dept: "ฝ่ายบุคคล" },
  { name: "นาย ธนากร ศรีสวัสดิ์", dept: "ฝ่ายผลิต" },
  { name: "นาย กิตติพงษ์ ดีงาม", dept: "ฝ่ายไอที" },
  { name: "นางสาว พิมพ์ชนก แสงดี", dept: "ฝ่ายบัญชี" },
  { name: "นาย สมศรี ใจดีจัง", dept: "ฝ่ายผลิต" },
  { name: "นาง อรุณี วงศ์ทอง", dept: "ฝ่ายจัดซื้อ" },
  { name: "นาย ปกรณ์ บุญมา", dept: "ฝ่ายขาย" },
  { name: "นางสาว ชุติมา แก้วใส", dept: "ฝ่ายการตลาด" },
  { name: "นาย ณัฐพล ทองคำ", dept: "ฝ่ายไอที" },
];

const HOSPITALS = ["รพ.กรุงเทพ", "รพ.บำรุงราษฎร์", "รพ.รามาธิบดี", "รพ.พญาไท", "คลินิกทันตกรรมยิ้มใส"];
const WELFARES: WelfareType[] = ["medical", "medical", "education", "dental", "self_dev", "accident"];
const APPROVERS = ["คุณศิริพร", "คุณวรรณา", "คุณประเสริฐ"];

const pad = (n: number, len = 2) => String(n).padStart(len, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** วันสุดท้ายของเดือน */
function lastDay(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** บวกวันให้วันที่ ISO */
function addDays(isoDate: string, days: number) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** กำหนดจ่ายตามรอบ ใช้กฎจากการตั้งค่าการจ่ายเงิน (ค่าเริ่มต้น) */
export function defaultPayDate(year: number, month: number, round: RoundNo): string {
  return resolvePayDate(year, month, round, DEFAULT_PAY_SETTINGS);
}

function buildRequests(): PaymentRequest[] {
  const rand = createRandom(2569);
  const list: PaymentRequest[] = [];
  const total = 120;

  for (let i = 0; i < total; i++) {
    // กระจายคำขอตั้งแต่ ม.ค. 2025 ถึง พ.ย. 2026 (23 เดือน)
    const monthIndex = Math.floor((i * 23) / total);
    const year = 2025 + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const maxDay = year === 2026 && month === 11 ? 3 : lastDay(year, month);
    const day = 1 + Math.floor(rand() * maxDay);
    const round: RoundNo = day <= 15 ? 1 : 2;

    const emp = EMPLOYEES[Math.floor(rand() * EMPLOYEES.length)];
    const empNo = EMPLOYEES.indexOf(emp) + 1;
    const welfare = WELFARES[Math.floor(rand() * WELFARES.length)];
    const amount = (5 + Math.floor(rand() * 86)) * 100; // 500 – 9,000
    const requestDate = iso(year, month, day);
    const payDate = defaultPayDate(year, month, round);
    const status: PaymentStatus = payDate < MOCK_TODAY ? "paid" : "pending";
    const seq = pad(i + 1, 3);

    list.push({
      id: `REQ${year}${seq}`,
      employeeId: `EMP${pad(empNo, 3)}`,
      employeeName: emp.name,
      department: emp.dept,
      welfare,
      amount,
      paidAmount: Math.min(amount, 8000), // วงเงินสูงสุดต่อครั้ง 8,000
      requestDate,
      payDate,
      round,
      status,
      receiptNo: `RC${year}${seq}`,
      approvalNo: `AP${year}${seq}`,
      hospital: welfare === "dental" ? HOSPITALS[4] : HOSPITALS[Math.floor(rand() * 4)],
      treatmentDate: addDays(requestDate, -4),
      receiptDate: addDays(requestDate, -1),
      submitter: emp.name.split(" ")[1],
      receiptIssuer: welfare === "dental" ? HOSPITALS[4] : "รพ.กรุงเทพ",
      accountingRef: `FA-${year}-${seq}`,
      approvedDate: addDays(requestDate, 2),
      approver: APPROVERS[Math.floor(rand() * APPROVERS.length)],
      payer: "ฝ่ายการเงิน",
      bankAccount: `xxx-xxx-${pad(1000 + Math.floor(rand() * 9000), 4)}`,
    });
  }
  // ใหม่สุดขึ้นก่อน
  return list.reverse();
}

/** รวมคำขอเป็นรอบจ่าย: 1 รอบ = (ปี, เดือน, รอบที่, ประเภทสวัสดิการ) */
export function buildRounds(requests: PaymentRequest[]): PayRound[] {
  const map = new Map<string, PayRound>();
  for (const r of requests) {
    const { year, month } = { year: Number(r.requestDate.slice(0, 4)), month: Number(r.requestDate.slice(5, 7)) };
    const key = `${year}-${month}-${r.round}-${r.welfare}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { id: key, round: r.round, year, month, welfare: r.welfare, payDate: r.payDate, status: r.status });
    } else if (r.status === "pending") {
      existing.status = "pending"; // ถ้ายังมีรายการรอจ่ายอยู่ ถือว่ารอบนี้ยังรอจ่าย
    }
  }
  return [...map.values()].sort((a, b) => (a.payDate < b.payDate ? 1 : -1));
}

// สร้างครั้งเดียวตอนโหลดไฟล์ แล้วใช้ซ้ำ (รอบจ่ายคำนวณด้วย buildRounds() ในหน้าตั้งค่ารอบจ่าย)
const REQUESTS = buildRequests();

/** คำขอเบิกทั้งหมด (ภายหลังเปลี่ยนเป็น fetch จาก API) */
export function getPaymentRequests(): PaymentRequest[] {
  return REQUESTS;
}

/** ผู้ใช้ที่ล็อกอินอยู่ (ตัวอย่าง: ฝ่ายการเงิน) */
export const CURRENT_USER = { name: "ศิริพร ใจงาม", role: "finance" as const };
