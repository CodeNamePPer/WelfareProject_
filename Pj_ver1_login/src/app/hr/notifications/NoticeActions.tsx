'use client';

import Link from 'next/link';
import { useNavTransition } from '@/lib/useNavTransition';
import { useState, type ReactNode } from 'react';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/features/hr/ui';

/** บันทึกว่าอ่านแล้ว แบบไม่รอผล (กดเปิดรายการต้องไปต่อได้ทันที) */
function markRead(keys: string[]) {
  return fetch('/api/hr/notifications/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
    keepalive: true,
  }).catch(() => undefined);
}

/** แถวแจ้งเตือน: กดแล้วบันทึกว่าอ่านแล้วก่อนเปิดหน้าปลายทาง */
export function NoticeLink({ id, href, read, className, children }: { id: string; href: string; read: boolean; className: string; children: ReactNode }) {
  return (
    <Link href={href} onClick={() => (read ? undefined : void markRead([id]))} className={className}>
      {children}
    </Link>
  );
}

/** ปุ่ม "อ่านทั้งหมดแล้ว" (ดีไซน์ H07) */
export function MarkAllRead({ unread }: { unread: number }) {
  const nav = useNavTransition();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    if (busy || unread === 0) return;
    setBusy(true);
    try {
      const response = await fetch('/api/hr/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!response.ok) return notify('บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      nav.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="quiet" className="!px-4" onClick={() => void markAll()} disabled={busy || nav.isPending || unread === 0}>
      {busy || nav.isPending ? 'กำลังบันทึก...' : 'อ่านทั้งหมดแล้ว'}
    </Button>
  );
}
