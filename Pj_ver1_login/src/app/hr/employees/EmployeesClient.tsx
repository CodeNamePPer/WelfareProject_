'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Pagination } from '@/components/tailgrids/core/pagination';
import { cx } from '@/lib/cx';
import { Badge, ButtonLink, Card, EmptyState, FilterPill, PageHeader, RequesterCompact, Tabs, fieldClass } from '@/features/hr/ui';
import type { EditRequestHistoryItem, EditRequestItem } from '@/lib/hr/editRequests';
import { EditHistory } from './requests/EditHistory';
import { RequestCard } from './requests/RequestCard';

export type EmployeeRow = {
  code: string;
  name: string;
  photoUrl?: string | null;
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

export type EmployeesTab = 'active' | 'left' | 'edits' | 'history';
type Tab = EmployeesTab;

// คอลัมน์ตามดีไซน์ H05
const COLS = 'grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_140px_110px_120px]';
/** แสดงทีละ 20 คน เกินนี้ขึ้นตัวเลือกหน้า */
const PAGE_SIZE = 20;
const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b, 'th'));

export function EmployeesClient({
  rows,
  maxClaimsTotal,
  initialQuery,
  initialTab = 'active',
  editRequests,
  editHistory,
  viewerCode,
}: {
  rows: EmployeeRow[];
  maxClaimsTotal: number | null;
  initialQuery: string;
  initialTab?: Tab;
  /** คำขอแก้ไขข้อมูลที่รอตรวจ (null = โหลดไม่สำเร็จ) */
  editRequests: EditRequestItem[] | null;
  /** คำขอแก้ไขข้อมูลที่ปิดแล้ว (null = โหลดไม่สำเร็จ) */
  editHistory: EditRequestHistoryItem[] | null;
  viewerCode: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const editCount = editRequests?.length ?? 0;
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

  // เกิน 20 คนแบ่งหน้า เปลี่ยนแท็บหรือตัวกรองแล้วกลับไปหน้าแรก
  const [page, setPage] = useState(1);
  const filterKey = `${tab}|${q}|${department}|${position}|${level}`;
  const [pageKey, setPageKey] = useState(filterKey);
  if (pageKey !== filterKey) {
    setPageKey(filterKey);
    setPage(1);
  }
  const totalPages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = shown.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
            { id: 'edits', label: 'คำขอแก้ไขข้อมูล', count: editRequests === null ? null : editCount },
            { id: 'history', label: 'ประวัติการแก้ไขข้อมูล', count: editHistory?.length ?? null },
          ]}
        />

        {tab === 'history' ? (
          <EditHistory items={editHistory} />
        ) : tab === 'edits' ? (
          // คำขอแก้ไขข้อมูล (H12) ตรวจได้ในแท็บนี้เลย
          editRequests === null ? (
            <p className="px-5 py-6 text-13 text-status-rejected-ink">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
          ) : editRequests.length === 0 ? (
            <EmptyState>ไม่มีคำขอแก้ไขข้อมูลที่รอตรวจ</EmptyState>
          ) : (
            <div className="flex flex-col gap-3 bg-[#F8FAFC] p-4">
              {editRequests.map((request) => (
                <RequestCard key={request.id} request={request} own={request.employeeCode === viewerCode} />
              ))}
            </div>
          )
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
                {pageRows.map((row) => (
                  <Link
                    key={row.code}
                    href={`/hr/employees/${encodeURIComponent(row.code)}`}
                    className={cx('grid items-center gap-3.5 border-t border-[#F1F5F9] px-5 py-3 text-ink no-underline transition-colors hover:bg-surface motion-reduce:transition-none', COLS)}
                  >
                    <RequesterCompact person={{ name: row.name, code: row.code, photoUrl: row.photoUrl, position: row.positionName, department: row.departmentName }} />
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
              {shown.length > PAGE_SIZE ? (
                <div className="flex flex-col gap-2 border-t border-[#F1F5F9] px-5 py-3">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setPage} />
                  <p className="text-center text-12 text-muted tabular-nums">
                    แสดง {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, shown.length)} จาก {shown.length} คน
                  </p>
                </div>
              ) : null}
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
          คำขอแก้ไขข้อมูล{editCount > 0 ? ` (${editCount})` : ''}
        </button>
      </p>
    </>
  );
}
