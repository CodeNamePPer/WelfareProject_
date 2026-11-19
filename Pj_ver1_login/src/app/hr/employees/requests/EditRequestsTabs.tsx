'use client';

import { useState } from 'react';
import type { EditRequestHistoryItem, EditRequestItem } from '@/lib/hr/editRequests';
import { Card, EmptyState, Tabs } from '@/features/hr/ui';
import { EditHistory } from './EditHistory';
import { RequestCard } from './RequestCard';

type Tab = 'pending' | 'history';

/** หน้าคำขอแก้ไขข้อมูล (H12): แท็บคำขอที่รอตรวจ และแท็บประวัติคำขอที่ปิดแล้ว */
export function EditRequestsTabs({
  requests,
  history,
  viewerCode,
  canDecide,
}: {
  /** null = โหลดไม่สำเร็จ */
  requests: EditRequestItem[] | null;
  history: EditRequestHistoryItem[] | null;
  viewerCode: string;
  /** อนุมัติ/ไม่อนุมัติได้เฉพาะ HR (API ตอบ 403 ให้ Role อื่น) */
  canDecide: boolean;
}) {
  const [tab, setTab] = useState<Tab>('pending');

  return (
    <Card>
      <Tabs
        label="คำขอแก้ไขข้อมูล"
        value={tab}
        onChange={setTab}
        panelId="edit-requests-panel"
        items={[
          { id: 'pending', label: 'รอตรวจ', count: requests?.length ?? null },
          { id: 'history', label: 'ประวัติการแก้ไขข้อมูล', count: history?.length ?? null },
        ]}
      />
      <div id="edit-requests-panel" role="tabpanel">
        {tab === 'history' ? (
          <EditHistory items={history} />
        ) : requests === null ? (
          <p className="px-5 py-6 text-13 text-status-rejected-ink">โหลดคำขอไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
        ) : requests.length === 0 ? (
          <EmptyState>ไม่มีคำขอแก้ไขข้อมูลที่รอตรวจ</EmptyState>
        ) : (
          <div className="flex flex-col gap-3 bg-[#F8FAFC] p-4">
            {requests.map((request) => (
              <RequestCard key={request.id} request={request} own={request.employeeCode === viewerCode} canDecide={canDecide} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
