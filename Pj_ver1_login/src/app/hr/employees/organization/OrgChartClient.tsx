'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cx } from '@/lib/cx';
import type { OrgPerson } from '@/lib/hr/orgChart';
import { Avatar, Card, FilterPill, PageHeader, fieldClass } from '@/features/hr/ui';

type Node = OrgPerson & { children: Node[] };

/** สร้างต้นไม้จากสายบังคับบัญชา (คนที่ไม่มีหัวหน้าในรายชื่อ = ระดับบนสุด) */
function buildTree(people: OrgPerson[]): Node[] {
  const nodes = new Map(people.map((person) => [person.code, { ...person, children: [] as Node[] }]));
  const roots: Node[] = [];
  for (const node of nodes.values()) {
    const parent = node.managerCode && node.managerCode !== node.code ? nodes.get(node.managerCode) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** เหลือเฉพาะคนที่ตรงตัวกรอง และสายหัวหน้าของคนนั้น */
function prune(nodes: Node[], match: (person: OrgPerson) => boolean): Node[] {
  return nodes.flatMap((node) => {
    const children = prune(node.children, match);
    return match(node) || children.length > 0 ? [{ ...node, children }] : [];
  });
}

const Line = () => <div aria-hidden="true" className="mx-auto h-5 w-0.5 bg-[#CBD5E1]" />;

function PersonCard({ person, reports }: { person: OrgPerson; reports: number }) {
  const head = person.headOf.length > 0;
  const third = head
    ? `หัวหน้า ${person.headOf.join(', ')} · ${person.hrHead ? 'หัวหน้า HR' : reports > 0 ? `ลูกน้อง ${reports}` : (person.level ?? '')}`.replace(/ · $/, '')
    : [person.department, person.level].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/hr/employees/${encodeURIComponent(person.code)}`}
      className={cx(
        'flex w-[220px] max-w-full items-center gap-2.5 rounded-[8px] bg-white px-3 py-2.5 text-ink no-underline hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        head ? 'border-[1.5px] border-[#1D4ED8]' : 'border border-line',
      )}
    >
      <Avatar name={person.name} size="sm" className="!size-9 !text-13" />
      <span className="min-w-0">
        <span className="block truncate text-13 font-semibold">{person.name}</span>
        <span className="block truncate text-12 text-muted">{person.position ?? '—'}</span>
        {third ? <span className={cx('block truncate text-11', head ? 'text-[#1E40AF]' : 'text-[#8A94A6]')}>{third}</span> : null}
      </span>
    </Link>
  );
}

/** หัวหน้า 1 คนกับลูกน้องที่เรียงลงมา (ลูกน้องที่มีทีมของตัวเองแสดงทีมต่อใต้ชื่อ) */
function Branch({ node }: { node: Node }) {
  return (
    <li className="flex flex-col items-center">
      <PersonCard person={node} reports={node.children.length} />
      {node.children.length > 0 ? (
        <>
          <Line />
          <ul className="m-0 flex list-none flex-col items-center gap-2 p-0">
            {node.children.map((child) => (
              <Branch key={child.code} node={child} />
            ))}
          </ul>
        </>
      ) : null}
    </li>
  );
}

export function OrgChartClient({ people }: { people: OrgPerson[] }) {
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [level, setLevel] = useState('');
  const [query, setQuery] = useState('');

  const options = (pick: (person: OrgPerson) => string | null) => [...new Set(people.map(pick).filter((value): value is string => Boolean(value)))].sort();
  const levels = [...new Map(people.filter((person) => person.level).map((person) => [person.level as string, person.levelName])).entries()].sort(([a], [b]) => a.localeCompare(b));
  const q = query.trim().toLowerCase();
  const filtering = Boolean(department || position || level || q);
  const match = (person: OrgPerson) =>
    (!department || person.department === department) &&
    (!position || person.position === position) &&
    (!level || person.level === level) &&
    (!q || `${person.name} ${person.code}`.toLowerCase().includes(q));
  const tree = buildTree(people);
  const roots = filtering ? prune(tree, match) : tree;

  return (
    <>
      <PageHeader
        crumbs={[{ label: 'จัดการพนักงานและสิทธิ์', href: '/hr/employees' }, { label: 'โครงสร้างองค์กร' }]}
        title="โครงสร้างองค์กร"
        description="ใครเป็นหัวหน้าแผนก ใครอยู่ฝ่ายไหน · หัวหน้า 1 คนดูแลได้หลายคน (1:N)"
      />
      <div className="flex flex-wrap gap-2">
        <FilterPill label="แผนก: ทั้งหมด" value={department} onChange={setDepartment}>
          {options((person) => person.department).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </FilterPill>
        <FilterPill label="ตำแหน่ง" value={position} onChange={setPosition}>
          {options((person) => person.position).map((name) => (
            <option key={name}>{name}</option>
          ))}
        </FilterPill>
        <FilterPill label="ระดับ" value={level} onChange={setLevel}>
          {levels.map(([code, name]) => (
            <option key={code} value={code}>
              {[code, name].filter(Boolean).join(' ')}
            </option>
          ))}
        </FilterPill>
        <input type="search" aria-label="ค้นหา" placeholder="ค้นหาพนักงาน" value={query} onChange={(event) => setQuery(event.target.value)} className={cx(fieldClass, '!h-9 w-full sm:!w-[240px]')} />
      </div>

      <Card className="overflow-x-auto p-4 sm:p-6">
        {roots.length === 0 ? (
          <p className="py-6 text-center text-13 text-muted">{people.length === 0 ? 'ยังไม่มีพนักงานในระบบ' : 'ไม่มีพนักงานที่ตรงกับตัวกรอง'}</p>
        ) : (
          <div className="flex flex-col items-center gap-8">
            {roots.filter((root) => root.children.length > 0).map((root) => (
              <div key={root.code} className="flex w-full flex-col items-center">
                <PersonCard person={root} reports={root.children.length} />
                {root.children.length > 0 ? (
                  <>
                    <Line />
                    <div aria-hidden="true" className="h-0.5 w-[760px] max-w-full bg-[#CBD5E1]" />
                    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-8 gap-y-4 p-0">
                      {root.children.map((child) => (
                        <li key={child.code} className="flex flex-col items-center">
                          <Line />
                          <ul className="m-0 list-none p-0">
                            <Branch node={child} />
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            ))}
            {/* คนที่ยังไม่ได้กำหนดหัวหน้าและไม่มีลูกน้อง: เรียงเป็นแถว ไม่มีเส้นเชื่อม */}
            {roots.some((root) => root.children.length === 0) ? (
              <ul aria-label="ยังไม่ได้กำหนดหัวหน้า" className="m-0 flex list-none flex-wrap justify-center gap-2 p-0">
                {roots
                  .filter((root) => root.children.length === 0)
                  .map((root) => (
                    <li key={root.code}>
                      <PersonCard person={root} reports={0} />
                    </li>
                  ))}
              </ul>
            ) : null}
          </div>
        )}
      </Card>
      <p className="text-12 text-muted">กรอบสีน้ำเงิน = หัวหน้าแผนก ยื่นคำขอแทนคนในแผนกตัวเองได้ · ไม่แสดงพนักงานที่ลาออกหรือเสียชีวิต</p>
    </>
  );
}
