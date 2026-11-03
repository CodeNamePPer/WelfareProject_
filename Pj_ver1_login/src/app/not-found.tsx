import Link from 'next/link';

// 404 สำหรับ URL นอก /admin – "/" จะส่งต่อไปหน้าที่เหมาะกับสิทธิ์ของผู้ใช้เอง
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-[16px]">
      <section className="flex w-full max-w-[420px] flex-col items-start gap-[14px] rounded-[10px] border border-line bg-white p-[20px]">
        <p className="text-13 font-semibold text-muted tabular-nums">404</p>
        <h1 className="text-22 font-semibold text-ink">ไม่พบหน้าที่ต้องการ</h1>
        <p className="text-14 text-muted">ลิงก์อาจพิมพ์ผิด หรือหน้านี้ถูกย้ายไปแล้ว</p>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-primary-600 px-4 text-14 font-medium text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          กลับหน้าแรก
        </Link>
      </section>
    </main>
  );
}
