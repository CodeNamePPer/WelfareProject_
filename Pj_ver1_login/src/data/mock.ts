// Mock data only. Replace with API calls when the database is connected.
import type {
  AuditEntry,
  Claim,
  ClaimEvent,
  ImportRecord,
  NotificationItem,
  RoleCount,
  SystemUser,
} from '../types';

export const notifications: NotificationItem[] = [
  {
    id: 'n1',
    kind: 'access-request',
    title: 'คำขอสิทธิ์ HR Recruiter',
    description: 'สมชาย ใจดี ขอสิทธิ์เข้าถึงโมดูลสรรหา',
    time: '5 นาทีที่แล้ว',
    unread: true,
    actionLabel: 'ตรวจสอบ',
  },
  {
    id: 'n2',
    kind: 'access-request',
    title: 'คำขอสร้างสวัสดิการใหม่จาก HR',
    description: 'วิภา สุขสันต์ ขอเพิ่มสวัสดิการ "ค่าตรวจสุขภาพประจำปี"',
    time: '32 นาทีที่แล้ว',
    unread: true,
    actionLabel: 'ตรวจสอบ',
  },
  {
    id: 'n3',
    kind: 'expiring',
    title: 'สิทธิ์รักษาการใกล้หมดอายุ',
    description: 'เหลือ 2 วัน',
    time: '1 ชั่วโมงที่แล้ว',
    unread: true,
  },
];

export const roleCounts: RoleCount[] = [
  { id: 'hr', role: 'HR', count: 6 },
  { id: 'finance', role: 'การเงิน', count: 4 },
  { id: 'employee', role: 'พนักงานทั่วไป', count: 118 },
];

// TODO: แทนด้วยตารางคำขอเบิกจริง – ข้อมูลจำลอง 5 คน ช่วง ก.ย.–พ.ย. 2569 ครบทุกสถานะและทุกขั้นตอน
// ผู้อนุมัติใช้ชื่อ HR / การเงินจาก systemUsers ด้านล่าง · รอบจ่ายเงินทุกวันที่ 25
const HR_VIPA = 'วิภา สุขสันต์ (HR)';
const HR_THANAKORN = 'ธนากร แสงทอง (HR)';
const FIN_PIMCHANOK = 'พิมพ์ชนก รัตนวงศ์ (การเงิน)';
const FIN_PRASERT = 'ประเสริฐ มั่งมี (การเงิน)';

/** วงเงินต่อปีต่อคน ของสวัสดิการที่ใช้ใน mock */
const ANNUAL_LIMITS: Record<string, number> = {
  'ผู้ป่วยนอก': 20000,
  'ผู้ป่วยใน': 50000,
  'ทันตกรรม': 5000,
  'ค่าเดินทาง': 9600,
  'ค่าเล่าเรียนบุตร': 30000,
  'ตรวจสุขภาพประจำปี': 4000,
  'ค่าแว่นสายตา': 5000,
};

const hr = (at: string, by: string, note?: string): ClaimEvent => ({ kind: 'hr-approved', at, by, note });
const fin = (at: string, by: string, note?: string): ClaimEvent => ({ kind: 'finance-approved', at, by, note });
const reject = (at: string, by: string, note: string): ClaimEvent => ({ kind: 'rejected', at, by, note });
const paid = (at: string, round: string): ClaimEvent => ({ kind: 'paid', at, by: 'ฝ่ายการเงิน', note: `โอนเข้าบัญชีเงินเดือน รอบ ${round}` });

type ClaimInput = Omit<Claim, 'annualLimit' | 'timeline' | 'attachments'> & { attachments?: string[] };

function claim(input: ClaimInput, ...events: ClaimEvent[]): Claim {
  return {
    attachments: ['ใบเสร็จรับเงิน.pdf'],
    ...input,
    annualLimit: ANNUAL_LIMITS[input.benefit] ?? null,
    timeline: [{ kind: 'submitted', at: input.date }, ...events],
  };
}

export const claims: Claim[] = [
  // ภูมิพัฒน์ – เบิกบ่อยสุด มีรอตรวจในเดือนนี้
  claim(
    { id: 'c1', code: 'CLM-2569-0002', employeeId: 'E00015', benefit: 'ผู้ป่วยนอก', amount: 1850, approvedAmount: 1850, status: 'approved', date: '2026-09-08', expenseDate: '2026-09-05', attachments: ['ใบเสร็จโรงพยาบาล.pdf', 'ใบรับรองแพทย์.pdf'] },
    hr('2026-09-09', HR_VIPA),
    fin('2026-09-11', FIN_PIMCHANOK),
    paid('2026-09-25', 'ก.ย. 2569'),
  ),
  claim(
    { id: 'c2', code: 'CLM-2569-0007', employeeId: 'E00015', benefit: 'ค่าเดินทาง', amount: 1200, approvedAmount: 1000, status: 'approved', date: '2026-10-06', expenseDate: '2026-10-03', note: 'เดินทางไปพบลูกค้าที่ชลบุรี', attachments: ['ใบเสร็จค่าน้ำมัน.jpg', 'ใบเสร็จทางด่วน.jpg'] },
    hr('2026-10-07', HR_THANAKORN),
    fin('2026-10-09', FIN_PIMCHANOK, 'ปรับยอดเป็น 1,000 บาท: ค่าทางด่วน 200 บาทไม่อยู่ในเงื่อนไขสิทธิ์'),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
  claim(
    { id: 'c3', code: 'CLM-2569-0010', employeeId: 'E00015', benefit: 'ทันตกรรม', amount: 2400, approvedAmount: 2400, status: 'approved', date: '2026-10-14', expenseDate: '2026-10-12' },
    hr('2026-10-15', HR_VIPA),
    fin('2026-10-17', FIN_PRASERT),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
  claim(
    { id: 'c4', code: 'CLM-2569-0012', employeeId: 'E00015', benefit: 'ผู้ป่วยนอก', amount: 650, approvedAmount: null, status: 'rejected', date: '2026-10-27', expenseDate: '2026-10-24', attachments: ['ใบเสร็จร้านขายยา.jpg'] },
    reject('2026-10-28', HR_VIPA, 'ใบเสร็จไม่ระบุชื่อผู้รับบริการ กรุณายื่นใหม่พร้อมใบเสร็จฉบับเต็ม'),
  ),
  claim({ id: 'c5', code: 'CLM-2569-0015', employeeId: 'E00015', benefit: 'ค่าเล่าเรียนบุตร', amount: 12000, approvedAmount: null, status: 'pending', date: '2026-11-02', expenseDate: '2026-10-30', note: 'ค่าเทอม 2/2569 บุตรคนที่ 1', attachments: ['ใบเสร็จค่าเทอม.pdf', 'สำเนาสูติบัตรบุตร.pdf'] }),
  claim({ id: 'c6', code: 'CLM-2569-0016', employeeId: 'E00015', benefit: 'ค่าเดินทาง', amount: 980, approvedAmount: null, status: 'pending', date: '2026-11-03', expenseDate: '2026-11-01' }),
  // ศิริพร – ผู้ป่วยในยอดสูง อนุมัติไม่เต็มจำนวน
  claim(
    { id: 'c7', code: 'CLM-2569-0003', employeeId: 'E00016', benefit: 'ผู้ป่วยใน', amount: 14500, approvedAmount: 12000, status: 'approved', date: '2026-09-19', expenseDate: '2026-09-15', attachments: ['ใบเสร็จโรงพยาบาล.pdf', 'ใบสรุปค่ารักษา.pdf', 'ใบรับรองแพทย์.pdf'] },
    hr('2026-09-21', HR_THANAKORN),
    fin('2026-09-24', FIN_PRASERT, 'อนุมัติ 12,000 บาท: ค่าห้องพักเกินสิทธิ์ 2,500 บาท'),
    paid('2026-09-25', 'ก.ย. 2569'),
  ),
  claim(
    { id: 'c8', code: 'CLM-2569-0009', employeeId: 'E00016', benefit: 'ตรวจสุขภาพประจำปี', amount: 3500, approvedAmount: 3500, status: 'approved', date: '2026-10-11', expenseDate: '2026-10-08' },
    hr('2026-10-12', HR_VIPA),
    fin('2026-10-14', FIN_PIMCHANOK),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
  claim({ id: 'c9', code: 'CLM-2569-0014', employeeId: 'E00016', benefit: 'ค่าแว่นสายตา', amount: 4200, approvedAmount: null, status: 'pending', date: '2026-11-01', expenseDate: '2026-10-29', attachments: ['ใบเสร็จร้านแว่น.jpg', 'ใบวัดสายตา.jpg'] }),
  // กมลวรรณ – มีรายการรอการเงิน
  claim(
    { id: 'c10', code: 'CLM-2569-0001', employeeId: 'E00011', benefit: 'ค่าเดินทาง', amount: 1500, approvedAmount: 1500, status: 'approved', date: '2026-09-03', expenseDate: '2026-08-29' },
    hr('2026-09-04', HR_THANAKORN),
    fin('2026-09-08', FIN_PIMCHANOK),
    paid('2026-09-25', 'ก.ย. 2569'),
  ),
  claim(
    { id: 'c11', code: 'CLM-2569-0005', employeeId: 'E00011', benefit: 'ทันตกรรม', amount: 1800, approvedAmount: 1800, status: 'approved', date: '2026-10-02', expenseDate: '2026-09-29' },
    hr('2026-10-03', HR_THANAKORN),
    fin('2026-10-06', FIN_PRASERT),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
  claim(
    { id: 'c12', code: 'CLM-2569-0013', employeeId: 'E00011', benefit: 'ผู้ป่วยนอก', amount: 2200, approvedAmount: null, status: 'pending', date: '2026-10-29', expenseDate: '2026-10-26', attachments: ['ใบเสร็จคลินิก.pdf'] },
    hr('2026-10-31', HR_VIPA),
  ),
  // ณัฐธิดา – ถูกปฏิเสธเพราะเกินวงเงิน แล้วยื่นใหม่ · มีรายการอนุมัติแล้วรอจ่าย
  claim(
    { id: 'c13', code: 'CLM-2569-0004', employeeId: 'E00013', benefit: 'ค่าแว่นสายตา', amount: 6500, approvedAmount: null, status: 'rejected', date: '2026-09-22', expenseDate: '2026-09-18', attachments: ['ใบเสร็จร้านแว่น.jpg'] },
    hr('2026-09-23', HR_VIPA),
    reject('2026-09-26', FIN_PIMCHANOK, 'ยอดเกินวงเงินค่าแว่นสายตา 5,000 บาท/ปี กรุณายื่นใหม่ภายในวงเงิน'),
  ),
  claim(
    { id: 'c14', code: 'CLM-2569-0006', employeeId: 'E00013', benefit: 'ค่าแว่นสายตา', amount: 5000, approvedAmount: 5000, status: 'approved', date: '2026-10-05', expenseDate: '2026-09-18', note: 'ยื่นใหม่แทนคำขอ CLM-2569-0004', attachments: ['ใบเสร็จร้านแว่น.jpg'] },
    hr('2026-10-06', HR_THANAKORN),
    fin('2026-10-08', FIN_PRASERT),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
  claim(
    { id: 'c15', code: 'CLM-2569-0011', employeeId: 'E00013', benefit: 'ผู้ป่วยนอก', amount: 900, approvedAmount: 900, status: 'approved', date: '2026-10-18', expenseDate: '2026-10-16' },
    hr('2026-10-20', HR_VIPA),
    fin('2026-10-28', FIN_PIMCHANOK),
  ),
  // อนุชา – เบิกน้อย
  claim(
    { id: 'c16', code: 'CLM-2569-0008', employeeId: 'E00014', benefit: 'ตรวจสุขภาพประจำปี', amount: 3500, approvedAmount: 3500, status: 'approved', date: '2026-10-09', expenseDate: '2026-10-07' },
    hr('2026-10-10', HR_THANAKORN),
    fin('2026-10-13', FIN_PRASERT),
    paid('2026-10-25', 'ต.ค. 2569'),
  ),
];

// ─── ข้อมูลผู้ใช้งานระบบ (Mock) ────────────────────────────────────────────
export const systemUsers: SystemUser[] = [
  {
    employeeId: 'E00001',
    email: 'somchai.j@company.co.th',
    name: 'สมชาย ใจดี',
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T08:12:00Z',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  {
    employeeId: 'E00003',
    email: 'vipa.s@company.co.th',
    name: 'วิภา สุขสันต์',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T14:05:00Z',
    updatedAt: '2026-09-15T11:30:00Z',
  },
  {
    employeeId: 'E00007',
    email: 'thanakorn.s@company.co.th',
    name: 'ธนากร แสงทอง',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-29T09:45:00Z',
    updatedAt: '2026-10-20T10:00:00Z',
  },
  {
    employeeId: 'E00012',
    email: 'pimchanok.r@company.co.th',
    name: 'พิมพ์ชนก รัตนวงศ์',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T07:30:00Z',
    updatedAt: '2026-10-10T08:00:00Z',
  },
  {
    employeeId: 'E00021',
    email: 'anon.k@company.co.th',
    name: 'อานนท์ กาญจนา',
    role: 'EMPLOYEE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-28T13:00:00Z',
    updatedAt: '2026-08-01T08:00:00Z',
  },
  {
    employeeId: 'E00034',
    email: 'nipa.w@company.co.th',
    name: 'นิภา วิชิต',
    role: 'EMPLOYEE',
    status: 'RESIGNED',
    lastLoginAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-09-10T15:00:00Z',
  },
  {
    employeeId: 'E00042',
    email: 'finance2@company.co.th',
    name: 'ประเสริฐ มั่งมี',
    role: 'FINANCE',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-30T10:20:00Z',
    updatedAt: '2026-10-05T09:30:00Z',
  },
  {
    employeeId: 'E00055',
    email: 'hr3@company.co.th',
    name: 'จิตรา สวยงาม',
    role: 'HR',
    status: 'ACTIVE',
    lastLoginAt: '2026-10-31T09:00:00Z',
    updatedAt: '2026-10-15T14:00:00Z',
  },
];

/** Sample rows shown as the import preview until file parsing is connected to the backend. */
export const importPreview: ImportRecord[] = [
  { id: 'IMP-001', date: '2026-10-10', benefit: 'ค่าเครื่องมือ AI สำหรับพนักงาน', claimant: 'วรางคณา', amount: 6000, status: 'approved' },
  { id: 'IMP-002', date: '2026-10-09', benefit: 'ค่าออกกำลังกาย / ฟิตเนส', claimant: 'สุพัตรา', amount: 12000, status: 'approved' },
  { id: 'IMP-003', date: '2026-10-07', benefit: 'ค่าตัดแว่นสายตา', claimant: 'วรางคณา', amount: 3000, status: 'approved' },
  { id: 'IMP-004', date: '2026-10-03', benefit: 'วัคซีนไข้หวัดใหญ่', claimant: 'สุพัตรา', amount: 1500, status: 'approved' },
  { id: 'IMP-005', date: '2026-09-30', benefit: 'ทุนอบรมหลักสูตรภายนอก', claimant: 'วรางคณา', amount: 20000, status: 'needs-fix' },
  { id: 'IMP-006', date: '2026-09-26', benefit: 'ค่าเดินทางมาทำงาน', claimant: 'สุพัตรา', amount: 9600, status: 'rejected' },
  { id: 'IMP-007', date: '2026-09-20', benefit: 'ค่าฝากครรภ์ / คลอดบุตร', claimant: 'วรางคณา', amount: 25000, status: 'approved' },
];

// ─── ประวัติการแก้ไข Log (Mock) ────────────────────────────────────────────
// หน้า /admin/logs อ่านจาก Supabase แล้ว · ชุดนี้ใช้เฉพาะแท็บประวัติในหน้าจัดการสวัสดิการ จนกว่าตารางสวัสดิการจะเขียน log จริง
const ADMIN_SOMCHAI = 'สมชาย ใจดี (E00001)';
const ADMIN_VIPA = 'วิภา สุขสันต์ (E00003)';
const userHref = (code: string) => `/admin/users?user=${code}`;

export const auditEntries: AuditEntry[] = [
  {
    id: 'g1', at: '2026-10-10T19:00', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'เปลี่ยนบทบาทของ สมชาย ดีใจมาก', detail: 'บทบาท',
    category: 'settings', action: 'role-change',
    target: { code: 'E00002', name: 'สมชาย ดีใจมาก', href: userHref('E00002') },
    change: { fields: [{ label: 'บทบาท', before: 'พนักงาน', after: 'ฝ่ายบุคคล (HR)' }], reason: 'ย้ายทีม' },
  },
  {
    id: 'g2', at: '2026-10-10T18:40', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'เพิ่มสวัสดิการใหม่', detail: 'ใช้กับแผนก IT',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-001', name: 'ค่าเครื่องมือ AI สำหรับพนักงาน' },
    change: {
      fields: [
        { label: 'วงเงิน', before: '—', after: '฿500/เดือน' },
        { label: 'ผู้มีสิทธิ์', before: '—', after: 'พนักงานประจำ แผนก IT' },
        { label: 'มีผลตั้งแต่', before: '—', after: '1 พ.ย. 2569' },
      ],
      reason: 'นโยบายสนับสนุนการใช้ AI',
    },
  },
  {
    id: 'g3', at: '2026-10-10T17:15', actor: 'ระบบ', actorRole: 'ระบบ', ip: '203.0.113.48',
    title: 'ล็อกบัญชีอัตโนมัติ', detail: 'ล็อกอินผิด 5 ครั้ง',
    category: 'issue', action: 'security',
    target: { code: 'E00012', name: 'พิมพ์ชนก รัตนวงศ์', href: userHref('E00012') },
    change: { fields: [{ label: 'สถานะบัญชี', before: 'ใช้งาน', after: 'ถูกล็อก 30 นาที' }] },
  },
  {
    id: 'g4', at: '2026-10-10T09:05', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แจ้ง Error', detail: 'ระบบล่ม',
    category: 'issue', action: 'system',
  },
  {
    id: 'g5', at: '2026-10-09T15:30', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ประวัติเบิก ก.ย. 2569',
    category: 'import', action: 'import', result: 'partial',
    importSummary: { file: 'import_sep.csv', total: 7, success: 5, failed: 2 },
  },
  {
    id: 'g6', at: '2026-10-09T11:20', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'ปรับวงเงินสวัสดิการ', detail: 'วงเงิน, วันที่มีผล',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-002', name: 'ค่าออกกำลังกาย / ฟิตเนส' },
    change: {
      fields: [
        { label: 'วงเงิน', before: '฿10,000/ปี', after: '฿12,000/ปี' },
        { label: 'มีผลตั้งแต่', before: '1 ม.ค. 2569', after: '1 ม.ค. 2570' },
      ],
      reason: 'ปรับตามอัตราตลาด',
    },
  },
  {
    id: 'g7', at: '2026-10-08T16:45', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แก้ไขข้อมูลผู้ใช้ นันทพร เจริญสุข', detail: 'อีเมล',
    category: 'settings', action: 'user-update',
    target: { code: 'E00004', name: 'นันทพร เจริญสุข', href: userHref('E00004') },
    change: { fields: [{ label: 'อีเมล', before: 'nanthaporn@qmail.com', after: 'nannaporn@qmail.com' }], reason: 'สะกดผิด' },
  },
  {
    id: 'g8', at: '2026-10-07T10:10', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'แก้ไขข้อมูลผู้ใช้ พงศกร วงศ์สวัสดิ์', detail: 'สถานะ',
    category: 'settings', action: 'user-update',
    target: { code: 'E00005', name: 'พงศกร วงศ์สวัสดิ์', href: userHref('E00005') },
    change: { fields: [{ label: 'สถานะ', before: 'ทำงานอยู่', after: 'ลาออก' }], reason: 'ลาออกมีผล 30 ก.ย. 69' },
  },
  {
    id: 'g9', at: '2026-09-28T14:00', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ประวัติเบิก ส.ค. 2569',
    category: 'import', action: 'import',
    importSummary: { file: 'import_aug.csv', total: 12, success: 12, failed: 0 },
  },
  {
    id: 'g13', at: '2026-09-27T09:40', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้าประวัติเบิกย้อนหลัง', detail: 'ไฟล์ไม่ตรงรูปแบบ (ไม่พบคอลัมน์ "รหัสพนักงาน")',
    category: 'import', action: 'import', result: 'failed',
    importSummary: { file: 'import_aug_v1.xlsx', total: 12, success: 0, failed: 12 },
  },
  {
    id: 'g10', at: '2026-09-15T09:30', actor: ADMIN_SOMCHAI, actorRole: 'Admin', ip: '10.0.4.21',
    title: 'ปิดใช้สวัสดิการ', detail: 'สถานะ',
    category: 'settings', action: 'welfare',
    target: { code: 'WEL-008', name: 'ค่าอาหารกลางวัน' },
    change: { fields: [{ label: 'สถานะ', before: 'ใช้งาน', after: 'หยุดใช้' }], reason: 'รวมเข้ากับค่าครองชีพ' },
  },
  {
    id: 'g11', at: '2026-09-02T13:25', actor: 'ระบบ', actorRole: 'ระบบ',
    title: 'แจ้งปัญหาหน้าเว็บโหลดช้า', detail: 'หน้า ส่งคำขอสวัสดิการ',
    category: 'issue', action: 'system',
  },
  {
    id: 'g12', at: '2025-12-20T10:00', actor: ADMIN_VIPA, actorRole: 'Admin', ip: '10.0.4.35',
    title: 'นำเข้ารายชื่อพนักงานใหม่', detail: 'พนักงานใหม่ 3 คน',
    category: 'import', action: 'import',
    importSummary: { file: 'new_hires.csv', total: 3, success: 3, failed: 0 },
  },
];
