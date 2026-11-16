'use client';

import { ClaimDetailPage, ClaimsTab } from '@/features/welfare/ClaimsTab';
import { PageHeader } from '@/components/ui/PageHeader';
import { useDetailParam } from '@/lib/useDetailParam';
import type { Claim, Employee } from '@/types';

// คำขอเบิกทั้งหมด (เดิมเป็นแท็บในหน้าจัดการสวัสดิการ) · ?claim=<เลขที่> เปิดรายละเอียด
export function AdminClaimsClient({ claims, employees }: { claims: Claim[]; employees: Employee[] }) {
  const detail = useDetailParam('claim');
  const opened = claims.find((claim) => claim.code === detail.id);
  if (opened) return <ClaimDetailPage claim={opened} claims={claims} employees={employees} />;

  return (
    <div className="flex flex-col gap-[20px]">
      <PageHeader title="คำขอเบิกทั้งหมด" description="คำขอเบิกสวัสดิการของพนักงานทุกคน อ่านอย่างเดียว HR และการเงินเป็นผู้ตรวจ" />
      <div className="rounded-[10px] border border-line bg-white">
        <ClaimsTab claims={claims} employees={employees} onOpen={(code) => detail.open(code)} />
      </div>
    </div>
  );
}
