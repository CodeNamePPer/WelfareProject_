'use client';

import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavTransition } from '@/lib/useNavTransition';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { cx } from '@/lib/cx';
import { Button, ButtonLink, Card, Input, ReadOnlyInput } from '@/features/hr/ui';

export type ProfileData = {
  head: boolean;
  /** ระบบตั้งค่าการส่งอีเมล (Resend) แล้ว */
  emailEnabled: boolean;
  name: string;
  initials: string;
  photoUrl?: string | null;
  code: string;
  position: string | null;
  department: string | null;
  managerName: string | null;
  roles: string[];
  loginEmail: string | null;
  hireDate: string;
  statusLabel: string;
  phone: string | null;
  emergencyContact: string | null;
  address: string | null;
  jobLevel: string | null;
  directReports: number;
  tenure: string;
  grantedNote: string;
  stats: { label: string; value: string; note: string }[];
  budget: { title: string; remaining: string; note: string; usedPercent: number; claims: string; reviewer: string; nextPay: string } | null;
  account: { bank: string; number: string } | null;
  logins: { label: string; at: string }[];
  employmentType: string | null;
  contact: { phone: string; emergency_contact_name: string; emergency_contact_phone: string; address_line: string };
  maritalStatus: string | null;
  childrenCount: number | null;
  pendingEditRequest: boolean;
  notifications: Record<string, { inApp: boolean; email: boolean }>;
  /** หน้าโปรไฟล์ของ Admin ส่งสิทธิ์ เรื่องที่แจ้ง และหมายเหตุข้อมูลติดต่อของตัวเองมา (ไม่ส่ง = ของ HR / หัวหน้า HR) */
  rights?: string[];
  topics?: [string, string, string][];
  contactNote?: string;
};

const TABS = ['ข้อมูลส่วนตัว', 'การทำงานและสิทธิ์', 'สวัสดิการของฉัน', 'ความปลอดภัย', 'การแจ้งเตือน'] as const;

// สิทธิ์ในระบบตามดีไซน์ P01 (HR) และ P02 (หัวหน้า HR)
const HR_RIGHTS = [
  'ตรวจและอนุมัติคำขอเบิก ปรับยอดได้พร้อมเหตุผล',
  'จัดการข้อมูลพนักงาน ปรับวงเงินรายคน',
  'เสนอสร้าง แก้ไข หรือปิดสวัสดิการ ผ่านหัวหน้า HR',
  'ดูประวัติการแก้ไข (Log)',
];
const HEAD_RIGHTS = ['อนุมัติ ขอข้อมูลเพิ่ม หรือไม่อนุมัติข้อเสนอสวัสดิการจาก HR และ Admin', 'สร้าง แก้ไข หรือปิดสวัสดิการได้ทันที ไม่ต้องเสนอ', 'ตรวจคำขอเบิกของ HR', 'ตั้งค่าซ่อนหรือแสดงสวัสดิการที่ใช้ไม่ได้', 'ทำงานทุกอย่างของ HR'];

// เรื่องที่แจ้งตามดีไซน์ [key, ชื่อเรื่อง, คำอธิบาย] การตั้งค่าเก็บใน hr_notification_preference (ไม่มีแถว = แจ้งในระบบ ไม่ส่งอีเมล)
const HR_TOPICS: [string, string, string][] = [
  ['claim_new', 'คำขอใหม่รอตรวจ', 'คำขอที่ส่งถึงคุณ'],
  ['claim_resubmitted', 'ผู้ขอแก้ไขแล้วส่งกลับ', 'คำขอที่คุณส่งกลับ'],
  ['advance_receipt', 'ใบเสร็จเบิกล่วงหน้ารอตรวจ', ''],
  ['employee_edit_request', 'คำขอแก้ไขข้อมูลพนักงาน', ''],
  ['proposal_decided', 'ผลข้อเสนอสวัสดิการ', 'หัวหน้า HR อนุมัติหรือขอข้อมูลเพิ่ม'],
  ['my_claim_status', 'สถานะคำขอเบิกของฉัน', 'ในฐานะพนักงาน'],
];
const HEAD_TOPICS: [string, string, string][] = [
  ['proposal_pending', 'ข้อเสนอสวัสดิการใหม่', 'จาก HR และ Admin'],
  ['hr_claim_pending', 'คำขอเบิกของ HR รอตรวจ', ''],
  ['claim_new', 'คำขอใหม่รอตรวจ', 'คิว HR'],
  ['my_claim_status', 'สถานะคำขอเบิกของฉัน', 'ในฐานะพนักงาน'],
];

const chipClass = (role: string) => cx('rounded-[999px] px-2.5 py-px text-12 font-medium', role === 'พนักงาน' ? 'bg-[#F1F5F9] text-[#475569]' : 'bg-[#DBEAFE] text-[#1E40AF]');

function RoleChips({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <span key={role} className={chipClass(role)}>
          {role}
        </span>
      ))}
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-16 font-semibold text-ink">{title}</h2>
      {note ? <span className="text-12 text-muted">{note}</span> : null}
    </div>
  );
}

/** ข้อมูลการทำงาน: ข้อความธรรมดา ไม่ล็อก ไม่จาง */
function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-12 text-muted">{label}</dt>
      <dd className="break-words text-14 text-ink">{value || '—'}</dd>
    </div>
  );
}

export function ProfileClient({ data }: { data: ProfileData }) {
  const [tab, setTab] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = TABS.length - 1;
    const next = event.key === 'ArrowRight' ? (index === last ? 0 : index + 1) : event.key === 'ArrowLeft' ? (index === 0 ? last : index - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? last : -1;
    if (next < 0) return;
    event.preventDefault();
    refs.current[next]?.focus();
    setTab(next);
  };
  const rights = data.rights ?? (data.head ? [...HEAD_RIGHTS, ...(data.directReports > 0 ? [`ยื่นคำขอแทนคนในแผนก (${data.directReports} คน)`] : [])] : HR_RIGHTS);
  const topics = data.topics ?? (data.head ? HEAD_TOPICS : HR_TOPICS);
  const nav = useNavTransition();
  const { notify } = useToast();

  // ออกจากระบบทุกอุปกรณ์: กดครั้งแรกถามยืนยัน เครื่องนี้ยังใช้งานต่อได้
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);
  async function logoutAll() {
    if (loggingOutAll) return;
    setLoggingOutAll(true);
    try {
      const response = await fetch('/api/auth/logout-all', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return notify(body.error ?? 'ออกจากระบบทุกอุปกรณ์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setConfirmLogoutAll(false);
      notify('ออกจากระบบทุกอุปกรณ์แล้ว เครื่องนี้ยังเข้าใช้งานต่อได้');
    } catch {
      notify('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoggingOutAll(false);
    }
  }

  // ข้อมูลติดต่อ: แก้แล้วส่งเป็นคำขอให้ HR คนอื่นตรวจ (H12)
  const [contact, setContact] = useState(data.contact);
  const [editReason, setEditReason] = useState('');
  const [editError, setEditError] = useState('');
  const [sending, setSending] = useState(false);
  const contactChanged = (Object.keys(contact) as (keyof typeof contact)[]).some((key) => contact[key].trim() !== data.contact[key]);
  async function sendEditRequest() {
    if (sending) return;
    if (!contactChanged) return setEditError('ยังไม่ได้เปลี่ยนข้อมูล');
    if (!editReason.trim()) return setEditError('ระบุเหตุผลที่ขอแก้ไข');
    setSending(true);
    setEditError('');
    try {
      const response = await fetch('/api/hr/profile/edit-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ changes: contact, reason: editReason }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) return setEditError(body.error ?? 'ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      notify('ส่งคำขอแก้ไขข้อมูลแล้ว รอ HR คนอื่นตรวจ');
      setEditReason('');
      nav.refresh();
    } finally {
      setSending(false);
    }
  }

  // การตั้งค่าแจ้งเตือน
  const [prefs, setPrefs] = useState<Record<string, { inApp: boolean; email: boolean }>>(() =>
    Object.fromEntries(topics.map(([key]) => [key, data.notifications[key] ?? { inApp: true, email: false }])),
  );
  const [savingPrefs, setSavingPrefs] = useState(false);
  async function savePrefs() {
    if (savingPrefs) return;
    setSavingPrefs(true);
    try {
      const response = await fetch('/api/hr/profile/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefs: Object.entries(prefs).map(([topic, value]) => ({ topic, ...value })) }),
      });
      notify(response.ok ? 'บันทึกการตั้งค่าแจ้งเตือนแล้ว' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <>
      <Card aria-label="โปรไฟล์" className="overflow-hidden">
        <div aria-hidden="true" className="h-24 bg-[#1E3A8A]" />
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap items-end gap-4">
            <div aria-hidden="true" className="-mt-[52px] flex size-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#DBEAFE] text-[32px] font-semibold text-[#1E40AF]">
              {data.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- รูปโปรไฟล์พนักงานในระบบ
                <img src={data.photoUrl} alt="" className="size-full object-cover" />
              ) : (
                data.initials || '?'
              )}
            </div>
            <div className="min-w-0 pb-1">
              <h1 className="text-22 font-semibold text-ink">{data.name}</h1>
              <p className="text-ink-soft">{[data.position, data.department].filter(Boolean).join(' · ')}</p>
              <p className="text-12 text-muted">{[data.code, data.managerName ? `หัวหน้า: ${data.managerName}` : null].filter(Boolean).join(' · ')}</p>
              <div className="mt-1.5">
                <RoleChips roles={data.roles} />
              </div>
            </div>
          </div>
          <ButtonLink href="/employee" variant="secondary">
            ไปพื้นที่ผู้ส่งคำขอ
          </ButtonLink>
        </div>
        <div role="tablist" aria-label="ส่วนของโปรไฟล์" className="flex gap-1 overflow-x-auto border-t border-line px-4 [scrollbar-width:none]">
          {TABS.map((label, index) => (
            <button
              key={label}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`profile-tab-${index}`}
              aria-selected={tab === index}
              aria-controls="profile-panel"
              tabIndex={tab === index ? 0 : -1}
              onClick={() => setTab(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cx(
                'shrink-0 px-2.5 py-3 text-14 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                tab === index ? 'font-semibold text-ink shadow-[inset_0_-2px_0_#1D4ED8]' : 'text-muted hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      <div id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${tab}`} className="flex flex-col gap-4">
        {tab === 0 ? (
          <>
            <Card className="p-5">
              <SectionTitle title="ข้อมูลที่ระบบกำหนด" note="แก้ไขไม่ได้ ติดต่อ HR ถ้าข้อมูลไม่ถูกต้อง" />
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <ReadOnlyInput label="ชื่อ-นามสกุล" value={data.name} />
                <ReadOnlyInput label="รหัสพนักงาน" value={data.code} />
                <ReadOnlyInput label="อีเมลเข้าสู่ระบบ" value={data.loginEmail} />
                <ReadOnlyInput label="วันเริ่มงาน" value={data.hireDate} />
                <ReadOnlyInput label="ประเภทพนักงาน" value={data.employmentType ?? "ยังไม่ระบุ"} />
                <ReadOnlyInput label="สถานะ" value={data.statusLabel} />
              </div>
            </Card>
            <Card className="p-5">
              <SectionTitle title="ข้อมูลติดต่อ" note={data.contactNote ?? `${data.head ? '' : 'HR '}แก้ข้อมูลตัวเองไม่ได้ ส่งคำขอให้ HR คนอื่นตรวจ`} />
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="โทรศัพท์" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} readOnly={data.pendingEditRequest} />
                <Input label="ผู้ติดต่อฉุกเฉิน" value={contact.emergency_contact_name} onChange={(event) => setContact({ ...contact, emergency_contact_name: event.target.value })} readOnly={data.pendingEditRequest} />
                <Input label="โทรผู้ติดต่อฉุกเฉิน" value={contact.emergency_contact_phone} onChange={(event) => setContact({ ...contact, emergency_contact_phone: event.target.value })} readOnly={data.pendingEditRequest} />
              </div>
              <Input className="mt-3.5" label="ที่อยู่" value={contact.address_line} onChange={(event) => setContact({ ...contact, address_line: event.target.value })} readOnly={data.pendingEditRequest} />
              {data.pendingEditRequest ? (
                <p className="mt-4 rounded-[8px] bg-[#FEF3C7] px-3 py-2.5 text-13 text-[#92400E]">มีคำขอแก้ไขข้อมูลที่รอ HR ตรวจอยู่ ยื่นเพิ่มได้หลังตัดสินแล้ว</p>
              ) : (
                <>
                  {contactChanged ? <Input className="mt-3.5" label="เหตุผลที่ขอแก้ไข" value={editReason} onChange={(event) => setEditReason(event.target.value)} /> : null}
                  {editError ? (
                    <p role="alert" className="mt-2 text-13 text-[#991B1B]">
                      {editError}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button onClick={() => void sendEditRequest()} disabled={sending || !contactChanged}>
                      {sending ? 'กำลังส่ง...' : 'ส่งคำขอแก้ไขข้อมูล'}
                    </Button>
                    <span className="text-12 text-muted">แก้ช่องด้านบนแล้วส่ง HR คนอื่นจะตรวจก่อนบันทึกจริง</span>
                  </div>
                </>
              )}
            </Card>
          </>
        ) : null}

        {tab === 1 ? (
          <>
            <Card className="p-5">
              <SectionTitle title="การทำงาน" />
              <dl className="grid grid-cols-2 gap-3.5 lg:grid-cols-3">
                <Fact label="แผนก" value={data.department} />
                <Fact label="ตำแหน่ง" value={data.position} />
                <Fact label="ระดับ" value={data.jobLevel} />
                <Fact label="หัวหน้าโดยตรง" value={data.managerName} />
                <Fact label="ลูกน้องโดยตรง" value={data.directReports > 0 ? `${data.directReports} คน` : '—'} />
                <Fact label="อายุงาน" value={data.tenure} />
              </dl>
            </Card>
            <div className="flex flex-wrap items-start gap-4">
              <Card className="min-w-0 flex-[2_1_420px] p-5">
                <SectionTitle title="สิทธิ์ในระบบ" />
                <RoleChips roles={data.roles} />
                <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                  {rights.map((right) => (
                    <li key={right} className="flex items-start gap-2 text-13 text-ink-soft">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#16A34A]" />
                      <span>{right}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-12 text-muted">{data.grantedNote}</p>
              </Card>
              <Card className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 p-5">
                {data.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-12 text-muted">{stat.label}</p>
                    <p className="text-22 font-semibold tabular-nums text-ink">{stat.value}</p>
                    <p className="text-12 text-muted">{stat.note}</p>
                  </div>
                ))}
              </Card>
            </div>
          </>
        ) : null}

        {tab === 2 ? (
          <>
            <Card className="p-5">
              {data.budget ? (
                <>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
                    <h2 className="text-16 font-semibold text-ink">{data.budget.title}</h2>
                    <Link href="/employee" className="text-13 text-[#1D4ED8] hover:underline">
                      ไปพื้นที่ผู้ส่งคำขอ ›
                    </Link>
                  </div>
                  <p className="text-[28px] leading-tight font-semibold tabular-nums text-ink">
                    {data.budget.remaining} <span className="text-13 font-normal text-muted">{data.budget.note}</span>
                  </p>
                  <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div className="h-full rounded-full bg-[#1D4ED8]" style={{ width: `${data.budget.usedPercent}%` }} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-13 text-ink-soft">
                    <span>{data.budget.claims}</span>
                    <span>{data.budget.reviewer}</span>
                    <span>{data.budget.nextPay}</span>
                  </div>
                </>
              ) : (
                <p className="text-13 text-muted">โหลดวงเงินไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
              )}
            </Card>
            <div className="flex flex-wrap items-start gap-4">
              <Card className="min-w-0 flex-[1_1_320px] p-5">
                <SectionTitle title="บัญชีรับเงินสวัสดิการ" />
                {data.account ? (
                  <div className="grid gap-3.5 sm:grid-cols-2">
                    <ReadOnlyInput label="ธนาคาร" value={data.account.bank} />
                    <ReadOnlyInput label="เลขบัญชี" value={data.account.number} />
                  </div>
                ) : (
                  <p className="text-13 text-muted">ยังไม่มีบัญชีรับเงินในระบบ</p>
                )}
                <p className="mt-3 text-12 text-muted">เปลี่ยนบัญชีต้องส่งสำเนาสมุดบัญชีให้การเงินตรวจ</p>
              </Card>
              <Card className="min-w-0 flex-[1_1_320px] p-5">
                <SectionTitle title="ครอบครัวที่เบิกสวัสดิการได้" note="บุตรสูงสุด 2 คน" />
                {data.maritalStatus || data.childrenCount ? (
                  <dl className="grid grid-cols-2 gap-3.5">
                    <Fact label="สถานภาพสมรส" value={data.maritalStatus} />
                    <Fact label="บุตร" value={data.childrenCount != null ? `${data.childrenCount} คน` : null} />
                  </dl>
                ) : (
                  <p className="text-13 text-muted">ยังไม่ได้ลงทะเบียนครอบครัว เพิ่มได้ผ่าน HR</p>
                )}
              </Card>
            </div>
          </>
        ) : null}

        {tab === 3 ? (
          <div className="flex flex-wrap items-start gap-4">
            <Card className="min-w-0 flex-[1_1_320px] p-5">
              <SectionTitle title="เปลี่ยนรหัสผ่าน" />
              <p className="text-13 text-ink-soft">เปลี่ยนรหัสผ่านที่หน้าเปลี่ยนรหัสผ่านของระบบ ต้องใส่รหัสผ่านปัจจุบันก่อนตั้งรหัสใหม่</p>
              <div className="mt-4">
                <ButtonLink href="/change-password">เปลี่ยนรหัสผ่าน</ButtonLink>
              </div>
            </Card>
            <Card className="min-w-0 flex-[1_1_320px] p-5">
              <SectionTitle title="การเข้าสู่ระบบล่าสุด" />
              {data.logins.length === 0 ? (
                <p className="text-13 text-muted">ยังไม่มีประวัติการเข้าสู่ระบบ</p>
              ) : (
                <ul className="m-0 list-none p-0">
                  {data.logins.map((login, index) => (
                    <li key={index} className={cx('flex flex-wrap justify-between gap-x-3 py-2 text-13', index > 0 && 'border-t border-[#F1F5F9]')}>
                      <span className="break-all">{login.label}</span>
                      <span className="text-muted">{login.at}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] pt-3">
                {confirmLogoutAll ? (
                  <>
                    <span className="text-13">ออกจากระบบบนเครื่องอื่นทั้งหมด? เครื่องนี้ยังใช้งานต่อได้</span>
                    <Button variant="reject" onClick={() => void logoutAll()} disabled={loggingOutAll}>
                      {loggingOutAll ? 'กำลังดำเนินการ...' : 'ยืนยัน'}
                    </Button>
                    <Button variant="quiet" onClick={() => setConfirmLogoutAll(false)} disabled={loggingOutAll}>
                      ยกเลิก
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="reject" onClick={() => setConfirmLogoutAll(true)}>
                      ออกจากระบบทุกอุปกรณ์
                    </Button>
                    <span className="text-12 text-muted">เครื่องอื่นจะถูกให้เข้าสู่ระบบใหม่ภายในไม่กี่วินาที</span>
                  </>
                )}
              </div>
            </Card>
          </div>
        ) : null}

        {tab === 4 ? (
          <Card className="overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] gap-3 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted">
              <span>เรื่องที่แจ้ง</span>
              <span className="text-center">ในระบบ</span>
              <span className="text-center">อีเมล</span>
            </div>
            {topics.map(([key, title, note]) => (
              <div key={key} className="grid grid-cols-[minmax(0,1fr)_72px_72px] items-center gap-3 border-t border-[#F1F5F9] px-5 py-3">
                <span className="min-w-0">
                  <span className="block font-medium">{title}</span>
                  {note ? <span className="block text-12 text-muted">{note}</span> : null}
                </span>
                <span className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs[key]?.inApp ?? true}
                    onChange={(event) => setPrefs({ ...prefs, [key]: { ...prefs[key], inApp: event.target.checked } })}
                    aria-label={`${title}: แจ้งในระบบ`}
                    className="size-4 accent-[#1D4ED8]"
                  />
                </span>
                <span className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={prefs[key]?.email ?? false}
                    onChange={(event) => setPrefs({ ...prefs, [key]: { ...prefs[key], email: event.target.checked } })}
                    aria-label={`${title}: ส่งอีเมล`}
                    className="size-4 accent-[#1D4ED8]"
                  />
                </span>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] px-5 py-4">
              <Button onClick={() => void savePrefs()} disabled={savingPrefs}>
                {savingPrefs ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
              <span className="text-12 text-muted">
                {data.emailEnabled ? 'อีเมลส่งไปที่อีเมลติดต่อในโปรไฟล์ของคุณ' : 'ผู้ดูแลระบบยังไม่ได้ตั้งค่าการส่งอีเมล ตัวเลือกอีเมลจะมีผลเมื่อเปิดใช้'}
              </span>
            </div>
          </Card>
        ) : null}
      </div>
    </>
  );
}
