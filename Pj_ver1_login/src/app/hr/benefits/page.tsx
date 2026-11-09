import type { Metadata } from "next";
import Link from "next/link";
import { getHrBenefits } from "@/lib/hr/benefits";
import { formatBahtWhole } from "@/lib/format";

export const metadata: Metadata = { title: "รายการสวัสดิการ" };

// ข้อมูลชุดเดียวกับ /admin/benefits และหน้าสิทธิ์ของพนักงาน HR ดูได้อย่างเดียว
export const dynamic = "force-dynamic";

export default async function BenefitsPage() {
  const benefits = await getHrBenefits();

  return (
    <div className="app-shell">
      <div className="app-main benefits-main">
        <div className="page-content benefits-content">
          <div className="benefits-heading">
            <div>
              <h1>รายการสวัสดิการ</h1>
              <p className="queue-meta">ดูได้อย่างเดียว การเพิ่มและแก้ไขสวัสดิการทำโดย Admin</p>
            </div>
            <div className="benefits-heading-actions">
              <Link href="/hr/benefits/approvals" className="button button-primary benefits-approve-button">
                อนุมัติคำขอเพิ่มสวัสดิการ
              </Link>
              <Link href="/hr/benefits/requests" className="button button-secondary benefits-track-button">
                ติดตามคำขอเพิ่มสวัสดิการ
              </Link>
            </div>
          </div>

          {benefits ? (
            <section className="benefits-table-card" aria-label="รายการสวัสดิการ">
              <div className="benefits-table-wrap">
                <table className="benefits-table">
                  <thead>
                    <tr>
                      <th scope="col">ชื่อสวัสดิการ</th>
                      <th scope="col">ประเภทสวัสดิการ</th>
                      <th scope="col">จำนวนเงิน</th>
                      <th scope="col">เงื่อนไขการเบิกจ่าย</th>
                      <th scope="col">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benefits.map((benefit) => (
                      <tr key={benefit.code}>
                        <td className="benefits-name">{benefit.name}</td>
                        <td>{benefit.category ?? "—"}</td>
                        <td>{formatBahtWhole(benefit.amount)} {benefit.budgetType}</td>
                        <td>
                          {[benefit.maxClaims, benefit.eligible].filter(Boolean).join(" ") || "—"}
                          {benefit.documents.length > 0 ? <span className="queue-meta">เอกสารที่ต้องแนบ: {benefit.documents.join(", ")}</span> : null}
                        </td>
                        <td>
                          <span className={`benefit-status-label${benefit.status === "active" ? "" : " is-disabled"}`} style={{ marginLeft: 0 }}>
                            {benefit.status === "active" ? "ใช้งาน" : "หยุดใช้"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {benefits.length === 0 ? (
                      <tr><td className="benefits-empty" colSpan={5}>ยังไม่มีรายการสวัสดิการ</td></tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p className="queue-alert" role="alert">โหลดรายการสวัสดิการไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
          )}
        </div>
      </div>
    </div>
  );
}
