"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Tier = "Admin" | "ผู้จัดการ" | "พนักงาน";
type Benefit = {
  id: string;
  name: string;
  category: string;
  amount: string;
  condition: string;
  tiers: Tier[];
  enabled?: boolean;
};

const tiers: Tier[] = ["พนักงาน", "ผู้จัดการ", "Admin"];
const initialBenefits: Benefit[] = [
  { id: "benefit-1", name: "ค่ารักษาพยาบาล", category: "ค่ารักษาพยาบาล", amount: "10,000 บาท", condition: "เบิกตามค่าใช้จ่ายจริง ต้องมีใบเสร็จและใบรับรองแพทย์", tiers: ["พนักงาน", "ผู้จัดการ", "Admin"], enabled: true },
  { id: "benefit-2", name: "ค่าทันตกรรม", category: "ค่ารักษาพยาบาล", amount: "3,000 บาท", condition: "อุด / ถอน / ขูดหินปูน เท่านั้น", tiers: ["พนักงาน", "ผู้จัดการ", "Admin"], enabled: true },
  { id: "benefit-3", name: "พัฒนาตัวเอง/เรียน", category: "ทุนการศึกษา", amount: "5,000 บาท", condition: "ต้องเกี่ยวข้องกับงาน และมีใบเสร็จรับเงิน", tiers: ["พนักงาน", "ผู้จัดการ"], enabled: true },
  { id: "benefit-4", name: "ตรวจสุขภาพประจำปี", category: "ค่ารักษาพยาบาล", amount: "ตามแพ็กเกจ A", condition: "ใช้สิทธิ์ได้ปีละ 1 ครั้ง ที่โรงพยาบาลตามบริษัทกำหนด", tiers: ["พนักงาน", "ผู้จัดการ", "Admin"], enabled: true },
];

function isBenefit(value: unknown): value is Benefit {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value && typeof value.id === "string" &&
    "name" in value && typeof value.name === "string" &&
    "category" in value && typeof value.category === "string" &&
    "amount" in value && typeof value.amount === "string" &&
    "condition" in value && typeof value.condition === "string" &&
    "tiers" in value && Array.isArray(value.tiers) &&
    value.tiers.every((tier): tier is Tier => tier === "Admin" || tier === "ผู้จัดการ" || tier === "พนักงาน") &&
    (!("enabled" in value) || typeof value.enabled === "boolean")
  );
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}

export default function BenefitsPage() {
  const [selectedTier, setSelectedTier] = useState<Tier>("พนักงาน");
  const [benefits, setBenefits] = useState(initialBenefits);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = sessionStorage.getItem("benefit-records");
        let records = initialBenefits;
        if (saved) {
          const parsedRecords: unknown = JSON.parse(saved);
          if (!Array.isArray(parsedRecords) || !parsedRecords.every(isBenefit)) {
            setNotice("ไม่สามารถโหลดข้อมูลสวัสดิการที่บันทึกไว้ได้");
            return;
          }
          records = parsedRecords.map((benefit) => ({ ...benefit, enabled: benefit.enabled !== false }));
        } else {
          sessionStorage.setItem("benefit-records", JSON.stringify(records));
        }
        setBenefits(records);

        const newBenefit = sessionStorage.getItem("new-benefit");
        if (!newBenefit) return;
        const parsed: unknown = JSON.parse(newBenefit);
        if (!isBenefit(parsed)) {
          setNotice("ไม่สามารถโหลดข้อมูลสวัสดิการรายการใหม่ได้");
          return;
        }
        sessionStorage.removeItem("new-benefit");
        const nextBenefits = [{ ...parsed, enabled: parsed.enabled !== false }, ...records];
        sessionStorage.setItem("benefit-records", JSON.stringify(nextBenefits));
        setBenefits(nextBenefits);
        setNotice(`เพิ่มสวัสดิการ “${parsed.name}” เรียบร้อยแล้ว`);
      } catch {
        setNotice("ไม่สามารถโหลดข้อมูลสวัสดิการที่บันทึกไว้ได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const tierBenefits = useMemo(
    () => benefits.filter((benefit) => benefit.tiers.includes(selectedTier)),
    [benefits, selectedTier],
  );

  function toggleBenefit(benefitId: string) {
    const nextBenefits = benefits.map((benefit) =>
      benefit.id === benefitId ? { ...benefit, enabled: benefit.enabled === false } : benefit,
    );
    try {
      sessionStorage.setItem("benefit-records", JSON.stringify(nextBenefits));
      setBenefits(nextBenefits);
      const benefit = nextBenefits.find((item) => item.id === benefitId);
      setNotice(`เปลี่ยนสถานะสวัสดิการเป็น${benefit?.enabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}เรียบร้อยแล้ว`);
    } catch {
      setNotice("ไม่สามารถบันทึกสถานะสวัสดิการได้");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main benefits-main">
        <div className="page-content benefits-content">
          <div className="benefits-heading">
            <h1>ตั้งค่าสวัสดิการ</h1>
            <div className="benefits-heading-actions">
              <Link href="/hr/benefits/approvals" className="button button-primary benefits-approve-button">
                อนุมัติคำขอเพิ่มสวัสดิการ
              </Link>
              <Link href="/hr/benefits/requests" className="button button-secondary benefits-track-button">
                ติดตามคำขอเพิ่มสวัสดิการ
              </Link>
              <Link href="/hr/benefits/add" className="button button-secondary benefits-add-button">
                <PlusIcon /> เพิ่มสวัสดิการใหม่
              </Link>
            </div>
          </div>

          <section className="benefits-tier-card" aria-label="เลือกกลุ่มพนักงาน">
            <label htmlFor="benefits-tier">เลือกกลุ่มพนักงานที่ต้องการตั้งค่า</label>
            <select id="benefits-tier" value={selectedTier} onChange={(event) => setSelectedTier(event.target.value as Tier)}>
              {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
            </select>
          </section>

          <section className="benefits-table-card" aria-label={`รายการสวัสดิการสำหรับ${selectedTier}`}>
            <div className="benefits-table-wrap">
              <table className="benefits-table">
                <thead>
                  <tr>
                    <th scope="col">ชื่อสวัสดิการ</th>
                    <th scope="col">ประเภทสวัสดิการ</th>
                    <th scope="col">จำนวนเงิน</th>
                    <th scope="col">เงื่อนไขการเบิกจ่าย</th>
                    <th scope="col">สถานะ</th>
                    <th scope="col">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {tierBenefits.map((benefit) => (
                    <tr key={benefit.id}>
                      <td className="benefits-name">{benefit.name}</td>
                      <td>{benefit.category}</td>
                      <td>{benefit.amount}</td>
                      <td>{benefit.condition}</td>
                      <td>
                        <button
                          type="button"
                          className={`benefit-status-switch${benefit.enabled === false ? "" : " is-enabled"}`}
                          role="switch"
                          aria-checked={benefit.enabled !== false}
                          aria-label={`${benefit.enabled === false ? "เปิด" : "ปิด"}การใช้งาน${benefit.name}`}
                          onClick={() => toggleBenefit(benefit.id)}
                        >
                          <span />
                        </button>
                        <span className={`benefit-status-label${benefit.enabled === false ? " is-disabled" : ""}`}>
                          {benefit.enabled === false ? "ปิดใช้งาน" : "ใช้งาน"}
                        </span>
                      </td>
                      <td>
                        <Link className="benefit-edit-button" href={`/hr/benefits/add?edit=${encodeURIComponent(benefit.id)}`}>
                          แก้ไขข้อมูล
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {tierBenefits.length === 0 ? (
                    <tr><td className="benefits-empty" colSpan={6}>ยังไม่มีรายการสวัสดิการในกลุ่มนี้</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
      {notice ? (
        <div className="toast" role="status">
          <span className="toast-check">✓</span>
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="ปิดข้อความ">×</button>
        </div>
      ) : null}
    </div>
  );
}
