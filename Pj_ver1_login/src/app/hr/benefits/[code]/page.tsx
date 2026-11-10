import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import { formatBahtWhole, formatThaiDate } from "@/lib/format";
import { getHrBenefits } from "@/lib/hr/benefits";

export const dynamic = "force-dynamic";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { code } = await params;
  return { title: `สวัสดิการ ${decodeURIComponent(code)}` };
}

// รายละเอียดสวัสดิการของ HR เปิดจากแถวในหน้ารายการสวัสดิการ ดูได้อย่างเดียว
export default async function BenefitDetailPage({ params }: { params: Params }) {
  const [{ code }, benefits] = await Promise.all([params, getHrBenefits()]);

  if (benefits === null) {
    return (
      <div className="page-content queue-page">
        <p className="queue-alert" role="alert">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
      </div>
    );
  }

  const benefit = benefits.find((item) => item.code === decodeURIComponent(code));
  if (!benefit) notFound();

  return (
    <div className="page-content queue-page profile-page">
      <Breadcrumb items={[{ label: "รายการสวัสดิการ", href: "/hr/benefits" }, { label: benefit.code }]} />

      <header className="queue-heading">
        <h1>{benefit.name}</h1>
        <ul className="queue-summary">
          <li>{benefit.code}</li>
          {benefit.category ? <li>{benefit.category}</li> : null}
          <li>
            <span className={`benefit-status-label${benefit.status === "active" ? "" : " is-disabled"}`} style={{ marginLeft: 0 }}>
              {benefit.status === "active" ? "ใช้งาน" : "หยุดใช้"}
            </span>
          </li>
        </ul>
      </header>

      <section className="queue-sheet profile-sheet" aria-labelledby="benefit-conditions">
        <h2 id="benefit-conditions">เงื่อนไขการเบิก</h2>
        <dl className="profile-facts">
          <div>
            <dt>วงเงิน</dt>
            <dd>
              {formatBahtWhole(benefit.amount)} {benefit.budgetType}
              {benefit.nextLimit ? (
                <span className="queue-meta">เปลี่ยนเป็น {formatBahtWhole(benefit.nextLimit.amount)} ตั้งแต่ {formatThaiDate(benefit.nextLimit.from)}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt>จำนวนครั้งที่เบิกได้</dt>
            <dd>{benefit.maxClaims || "—"}</dd>
          </div>
          <div>
            <dt>ผู้มีสิทธิ์</dt>
            <dd>{benefit.eligible || "—"}</dd>
          </div>
          <div>
            <dt>วันที่เริ่มใช้วงเงิน</dt>
            <dd>{benefit.startDate ? formatThaiDate(benefit.startDate) : "—"}</dd>
          </div>
          <div>
            <dt>ผู้อนุมัติการเบิก</dt>
            <dd>{ROLE_LABELS[benefit.approver as Role] ?? "—"}</dd>
          </div>
          <div>
            <dt>งบรวมโดยประมาณ</dt>
            <dd>{benefit.estimatedBudget}</dd>
          </div>
          <div>
            <dt>แก้ไขล่าสุด</dt>
            <dd>{formatThaiDate(benefit.updatedAt)}</dd>
          </div>
        </dl>
      </section>

      <section className="queue-sheet profile-sheet" aria-labelledby="benefit-documents">
        <h2 id="benefit-documents">เอกสารที่พนักงานต้องแนบ</h2>
        <ol className="benefit-detail-documents">
          <li>ใบเสร็จรับเงินหรือหลักฐานการชำระเงิน</li>
          {benefit.documents.map((document) => (
            <li key={document}>{document}</li>
          ))}
        </ol>
        <p className="queue-meta">
          ใบเสร็จรับเงินระบบบังคับแนบทุกคำขอ รายการอื่นกำหนดโดย Admin ใช้ประกอบการตรวจคำขอ
        </p>
      </section>

      <p className="queue-meta">ดูได้อย่างเดียว การเพิ่มและแก้ไขสวัสดิการทำโดย Admin</p>
    </div>
  );
}
