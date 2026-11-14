'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import { Badge, ButtonLink, Card, EmptyState, FilterPill, PageHeader, RequesterCompact, Tabs, fieldClass } from '@/features/hr/ui';

export type EmployeeRow = {
  code: string;
  name: string;
  /** ใช้กรอง (มีค่าเสมอ) */
  department: string;
  position: string;
  /** ใช้แสดง (null = ยังไม่ระบุ) */
  positionName: string | null;
  departmentName: string | null;
  level: string;
  manager: string | null;
  /** จำนวนคำขอที่ยื่นปีนี้ (null = โหลดคำขอไม่สำเร็จ) */
  claims: number | null;
  active: boolean;
  statusLabel: string;
};

type Tab = 'active' | 'left' | 'edits';

// คอลัมน์ตามดีไซน์ H05
const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_140px_110px_120px]';
const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'th'));

export function EmployeesClient({ rows, maxClaimsTotal, initialQuery }: { rows: EmployeeRow[]; maxClaimsTotal: number | null; initialQuery: string }) {
  const [tab, setTab] = useState<Tab>('active');
  const [query, setQuery] = useState(initialQuery);
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [level, setLevel] = useState('');

  const activeCount = rows.filter((row) => row.active).length;
  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (row) =>
      (tab === 'active' ? row.active : !row.active) &&
      (!q || `${row.name} ${row.code}`.toLowerCase().includes(q)) &&
      (!department || row.department === department) &&
      (!position || row.position === position) &&
      (!level || row.level === level),
  );

  return (
    <>
      <PageHeader
        title="จัดการพนักงานและสิทธิ์"
        description={`${rows.length} คน · ทำงานอยู่ ${activeCount} · พ้นสภาพ ${rows.length - activeCount}`}
        actions={<ButtonLink href="/hr/employees/add">เพิ่มพนักงาน</ButtonLink>}
      />

      <Card>
        <Tabs
          label="กลุ่มพนักงาน"
          value={tab}
          onChange={setTab}
          items={[
            { id: 'active', label: 'ทำงานอยู่', count: activeCount },
            { id: 'left', label: 'พ้นสภาพ', count: rows.length - activeCount },
            { id: 'edits', label: 'คำขอแก้ไขข้อมูล' },
          ]}
        />

        {tab === 'edits' ? (
          // ยังไม่มีตารางคำขอแก้ไขข้อมูลพนักงาน (H12 อยู่ในข้อ 7)
          <EmptyState>ยังไม่เปิดให้พนักงานส่งคำขอแก้ไขข้อมูลในระบบ ตอนนี้ HR แก้ข้อมูลได้โดยตรงจากหน้าโปรไฟล์พนักงาน</EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 px-5 py-3">
              <input
                type="search"
                aria-label="ค้นหาพนักงาน"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ค้นหาชื่อ รหัส"
                className={cx(fieldClass, '!h-9 w-full sm:!w-[260px]')}
              />
              <FilterPill label="แผนก" value={department} onChange={setDepartment}>
                {unique(rows.map((row) => row.department)).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </FilterPill>
              <FilterPill label="ตำแหน่ง" value={position} onChange={setPosition}>
                {unique(rows.map((row) => row.position)).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </FilterPill>
              <FilterPill label="ระดับ" value={level} onChange={setLevel}>
                {unique(rows.map((row) => row.level)).map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </FilterPill>
            </div>
            {shown.length === 0 ? (
              <EmptyState>{q || department || position || level ? 'ไม่พบพนักงานที่ตรงกับตัวกรอง' : tab === 'active' ? 'ยังไม่มีพนักงานที่ทำงานอยู่' : 'ยังไม่มีพนักงานที่พ้นสภาพ'}</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  <div className={cx('grid gap-3.5 bg-[#F8FAFC] px-5 py-2 text-12 font-medium text-muted', COLS)}>
                    <span>พนักงาน</span>
                    <span>ระดับ / หัวหน้า</span>
                    <span>เบิกปีนี้</span>
                    <span>สถานะ</span>
                    <span />
                  </div>
                  {shown.map((row) => (
                    <Link
                      key={row.code}
                      href={`/hr/employees/${encodeURIComponent(row.code)}`}
                      className={cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3 text-ink no-underline transition-colors hover:bg-surface motion-reduce:transition-none', COLS)}
                    >
                      <RequesterCompact person={{ name: row.name, code: row.code, position: row.positionName, department: row.departmentName }} />
                      <span className="text-13">
                        {row.level}
                        <span className="block text-muted">หัวหน้า: {row.manager ?? '—'}</span>
                      </span>
                      <span className="text-13">{row.claims === null ? '—' : maxClaimsTotal ? `${row.claims}/${maxClaimsTotal} ครั้ง` : `${row.claims} ครั้ง`}</span>
                      <span>
                        <Badge tone={row.active ? 'approved' : 'neutral'}>{row.statusLabel}</Badge>
                      </span>
                      <span className="text-13 text-[#1D4ED8]">ดู / แก้ไข ›</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      <p className="text-12 text-muted">
        พนักงานที่พ้นสภาพ: ยื่นเบิกและยื่นแทนไม่ได้ทุกกรณี ·{' '}
        <Link href="/hr/employees/organization" className="text-[#1D4ED8] hover:underline">
          ดูโครงสร้างองค์กร
        </Link>{' '}
        ·{' '}
        <button type="button" onClick={() => setTab('edits')} className="text-[#1D4ED8] hover:underline">
          คำขอแก้ไขข้อมูล
        </button>
      </p>
    </>
  );
}
