import type { EditRequestHistoryItem } from '@/lib/hr/editRequests';
import { Badge, type BadgeTone } from '@/features/hr/ui';

const thaiDateTime = (iso: string) =>
  new Date(iso).toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' });

const STATUS: Record<EditRequestHistoryItem['status'], { label: string; tone: BadgeTone; by: string }> = {
  approved: { label: 'อนุมัติและบันทึกแล้ว', tone: 'approved', by: 'อนุมัติโดย' },
  rejected: { label: 'ไม่อนุมัติ', tone: 'rejected', by: 'ไม่อนุมัติโดย' },
  cancelled: { label: 'ผู้ขอยกเลิก', tone: 'neutral', by: '' },
};

const COLS = 'grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_150px_minmax(0,1.2fr)]';

/** ประวัติคำขอแก้ไขข้อมูลที่ปิดแล้ว: ใครขอเปลี่ยนอะไร ผลเป็นอย่างไร ใครตัดสินเมื่อไร */
export function EditHistory({ items }: { items: EditRequestHistoryItem[] | null }) {
  return (
    <section aria-label="ประวัติการแก้ไขข้อมูล">
      <p className="px-5 py-3 text-12 text-muted">คำขอที่ตัดสินหรือยกเลิกแล้ว ล่าสุด 50 รายการ</p>
      {items === null ? (
        <p className="px-5 pb-5 text-13 text-status-rejected-ink">โหลดประวัติไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
      ) : items.length === 0 ? (
        <p className="px-5 pb-5 text-13 text-muted">ยังไม่มีประวัติการแก้ไขข้อมูล</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[860px]">
            <div className={`grid ${COLS} gap-3 bg-[#F8FAFC] px-5 py-2.5 text-12 font-medium text-muted`}>
              <span>พนักงาน</span>
              <span>ข้อมูลที่ขอเปลี่ยน (เดิม → ใหม่)</span>
              <span>ผล</span>
              <span>ผู้ตรวจ · เวลา</span>
            </div>
            {items.map((item) => {
              const status = STATUS[item.status];
              return (
                <div key={item.id} className={`grid ${COLS} items-start gap-3 border-t border-[#F1F5F9] px-5 py-3 text-13`}>
                  <span className="min-w-0">
                    <span className="block font-medium">{item.employeeName}</span>
                    <span className="block text-12 text-muted">{item.line}</span>
                  </span>
                  <span className="min-w-0">
                    {item.changes.map((change) => (
                      <span key={change.field} className="block break-words">
                        <span className="text-muted">{change.label}: </span>
                        <span className="text-muted line-through">{change.old}</span> → <span className="font-medium">{change.new}</span>
                      </span>
                    ))}
                    <span className="block text-12 text-muted">เหตุผล: {item.reason}</span>
                  </span>
                  <span>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                  <span className="min-w-0 text-12 text-muted">
                    {item.deciderName ? (
                      <span className="block text-13 text-ink">
                        {status.by} {item.deciderName}
                      </span>
                    ) : null}
                    <span className="block">{thaiDateTime(item.closedAt)} น.</span>
                    <span className="block">ยื่น {thaiDateTime(item.submittedAt)} น.</span>
                    {item.decisionNote ? <span className="mt-1 block break-words text-ink-soft">ข้อความถึงพนักงาน: {item.decisionNote}</span> : null}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
