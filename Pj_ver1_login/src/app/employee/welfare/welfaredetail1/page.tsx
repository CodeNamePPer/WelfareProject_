import Link from "next/link";

const benefits = [
  "พนักงานประจำมีสิทธิ์เบิกจ่ายตามเงื่อนไขที่กำหนด",
  "ครอบคลุมค่ารักษาพยาบาลผู้ป่วยนอกและค่ายาตามใบเสร็จ",
  "ใช้สิทธิ์ได้ถึง 31 ธันวาคม 2569",
  "มีค่าใช้จ่ายสูงสุดไม่เกิน 30% ของวงเงินสิทธิ์ต่อปี",
  "ไม่สามารถใช้สิทธิ์ซ้ำกับสิทธิ์อื่นที่บริษัทให้ร่วมกันได้",
  "กรณีเบิกเกินวงเงินที่กำหนดจะต้องชำระเองทั้งหมด",
];

function DetailCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">
      <div className="text-11 font-medium uppercase tracking-[0.08em] text-muted">{title}</div>
      <div className="mt-2 text-15 font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function WelfareDetailPage() {
  return (
    <div className="mx-auto max-w-[1200px] px-2 py-5 text-ink">
      <div className="mb-4 text-12 text-muted">พนักงาน / สิทธิสวัสดิการ / ค่ารักษาพยาบาล</div>
      <h1 className="text-22 font-semibold leading-[1.1] tracking-[-0.04em] text-ink">รายละเอียดสวัสดิการ</h1>
      <p className="mt-2 text-13 text-muted">ตรวจสอบเงื่อนไขและสิทธิ์การใช้สวัสดิการของคุณ</p>
      <div className="mt-6 overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 10V8.5A5 5 0 0 1 17 8.5V10" />
                <path d="M5 10h14v7.5A2.5 2.5 0 0 1 16.5 20h-9A2.5 2.5 0 0 1 5 17.5V10Z" />
              </svg>
            </span>
            <div>
              <div className="text-11 uppercase tracking-[0.08em] text-muted">หมวดหมู่</div>
              <div className="text-15 font-semibold text-ink">ค่ารักษาพยาบาล</div>
            </div>
          </div>
          <button type="button" className="rounded-lg border border-line bg-white px-4 py-2 text-12 font-medium text-ink-soft transition hover:bg-primary-50">ใช้สิทธิ์</button>
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-[1.45fr_0.9fr]">
          <div className="rounded-xl border border-line bg-surface/70 p-4">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-15 font-semibold text-ink">เงื่อนไขการใช้สิทธิ์</h2>
              <div className="text-12 text-muted">หมดอายุ 31 ธ.ค. 2569</div>
            </div>
            <ul className="space-y-3 text-14 leading-6 text-ink-soft">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-muted" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-white p-4">
            <h2 className="text-15 font-semibold text-ink">วงเงินคงเหลือ</h2>
            <div className="mt-4 space-y-2">
              <DetailCard title="วงเงินรวม" value="10,000 บาท" />
              <DetailCard title="ใช้ไปแล้ว" value="2,500 บาท" />
              <DetailCard title="คงเหลือ" value="7,500 บาท" />
            </div>
            <div className="mt-5 border-t border-line pt-4 text-12 text-muted">
              <div className="font-medium text-ink-soft">อัปเดตล่าสุด</div>
              <div className="mt-2">1 ม.ค. – 31 ธ.ค. 2569</div>
            </div>
          </div>
        </div>
        <div className="border-t border-line bg-surface/80 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-11 font-medium uppercase tracking-[0.08em] text-muted">การยืนยัน</div>
              <p className="mt-1 text-13 text-ink-soft">การเบิกจ่ายจะต้องมีใบเสร็จและเอกสารยืนยันที่ชัดเจนตามเงื่อนไข</p>
            </div>
            <Link href="/employee/welfare" className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2.5 text-12 font-medium text-white transition hover:bg-primary-700">กลับสวัสดิการ</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
