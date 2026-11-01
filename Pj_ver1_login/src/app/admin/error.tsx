'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RotateCw } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

// แสดงแทนเนื้อหาเมื่อหน้า Admin โหลดไม่สำเร็จ – sidebar มาจาก admin/layout จึงยังใช้งานได้ตามปกติ
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] page failed to render', error);
  }, [error]);

  return (
    <div className="flex flex-col gap-[24px]">
      <PageHeader title="โหลดหน้านี้ไม่สำเร็จ" description="ระบบดึงข้อมูลไม่ได้ในขณะนี้ ข้อมูลของคุณไม่ได้รับผลกระทบ" />

      <section
        role="alert"
        className="flex flex-col items-start gap-[14px] rounded-[10px] border border-line bg-white p-[14px] sm:p-[20px]"
      >
        <p className="text-14 text-ink">ลองโหลดใหม่อีกครั้ง หากยังไม่สำเร็จให้แจ้งผู้ดูแลระบบพร้อมรหัสด้านล่าง</p>
        {error.digest ? <p className="text-13 text-muted tabular-nums">รหัสอ้างอิง: {error.digest}</p> : null}
        <div className="flex flex-wrap gap-[8px]">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center justify-center gap-[8px] rounded-lg bg-primary-600 px-4 text-14 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <RotateCw className="size-[16px]" aria-hidden="true" />
            โหลดใหม่
          </button>
          <Link
            href="/admin"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line bg-white px-4 text-14 font-medium text-ink transition-colors hover:border-primary-500 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </section>
    </div>
  );
}
