import Link from 'next/link';
import { PageHeader } from '@/components/ui/PageHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'ไม่พบหน้าที่ต้องการ' };

// แสดงเมื่อเปิด URL ใต้ /admin ที่ไม่มีอยู่ – sidebar มาจาก admin/layout จึงยังเลือกเมนูอื่นได้ทันที
export default function AdminNotFound() {
  return (
    <div className="flex flex-col gap-[24px]">
      <PageHeader title="ไม่พบหน้าที่ต้องการ" description="ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว" />

      <section className="flex flex-col items-start gap-[14px] rounded-[10px] border border-line bg-white p-[14px] sm:p-[20px]">
        <p className="text-14 text-ink">เลือกเมนูทางซ้ายเพื่อไปยังหน้าที่ต้องการ หรือกลับไปหน้าแรก</p>
        <Link
          href="/admin"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-14 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          กลับหน้าแรก
        </Link>
      </section>
    </div>
  );
}
