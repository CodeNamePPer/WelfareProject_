"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type QuotaMode = "fixed" | "actual" | "package";
type Tier = "Admin" | "ผู้จัดการ" | "พนักงาน";
type DocumentName = "ใบเสร็จรับเงิน" | "ใบรับรองแพทย์" | "เอกสารรับรองอื่น ๆ";

const categories = ["ค่ารักษาพยาบาล", "ทุนการศึกษา", "การเดินทาง", "ครอบครัว", "อื่น ๆ"];
const tiers: Tier[] = ["พนักงาน", "ผู้จัดการ", "Admin"];
const documentOptions: DocumentName[] = ["ใบเสร็จรับเงิน", "ใบรับรองแพทย์", "เอกสารรับรองอื่น ๆ"];

type BenefitRecord = {
  id: string;
  name: string;
  category: string;
  amount: string;
  condition: string;
  tiers: Tier[];
  enabled?: boolean;
};

function isBenefitRecord(value: unknown): value is BenefitRecord {
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

export default function AddBenefitPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [condition, setCondition] = useState("");
  const [quotaMode, setQuotaMode] = useState<QuotaMode>("fixed");
  const [amount, setAmount] = useState("5000");
  const [packageName, setPackageName] = useState("แพ็กเกจ A");
  const [requiredDocuments, setRequiredDocuments] = useState<DocumentName[]>(documentOptions.slice(0, 2));
  const [eligibleTiers, setEligibleTiers] = useState<Tier[]>(["พนักงาน"]);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const benefitId = new URLSearchParams(window.location.search).get("edit");
      if (!benefitId) return;

      setEditingId(benefitId);
      try {
        const saved = sessionStorage.getItem("benefit-records");
        const parsed: unknown = saved ? JSON.parse(saved) : null;
        if (!Array.isArray(parsed) || !parsed.every(isBenefitRecord)) {
          setError("ไม่สามารถโหลดข้อมูลสวัสดิการเพื่อแก้ไขได้");
          return;
        }
        const benefit = parsed.find((item) => item.id === benefitId);
        if (!benefit) {
          setError("ไม่พบสวัสดิการที่ต้องการแก้ไข");
          return;
        }

        setName(benefit.name);
        setCategory(benefit.category);
        setEligibleTiers(benefit.tiers);

        const documentMarker = " เอกสารที่ต้องแนบ: ";
        const markerIndex = benefit.condition.lastIndexOf(documentMarker);
        const conditionText = markerIndex >= 0 ? benefit.condition.slice(0, markerIndex) : benefit.condition;
        const documentsText = markerIndex >= 0 ? benefit.condition.slice(markerIndex + documentMarker.length) : "";
        const documents = documentsText
          .split(", ")
          .filter((document): document is DocumentName => documentOptions.includes(document as DocumentName));
        setCondition(conditionText);
        setRequiredDocuments(documents.length ? documents : documentOptions.slice(0, 2));

        if (benefit.amount === "จ่ายตามจริง (ไม่มีเพดาน)") {
          setQuotaMode("actual");
        } else if (benefit.amount.startsWith("ตามแพ็กเกจ ")) {
          setQuotaMode("package");
          setPackageName(benefit.amount.slice("ตามแพ็กเกจ ".length));
        } else {
          setQuotaMode("fixed");
          setAmount(benefit.amount.replace(/\D/g, "") || "5000");
        }
      } catch {
        setError("ไม่สามารถโหลดข้อมูลสวัสดิการเพื่อแก้ไขได้");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function toggleDocument(document: DocumentName) {
    setRequiredDocuments((current) =>
      current.includes(document) ? current.filter((item) => item !== document) : [...current, document],
    );
  }

  function toggleTier(tier: Tier) {
    setEligibleTiers((current) =>
      current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier],
    );
  }

  function saveBenefit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (eligibleTiers.length === 0) {
      setError("เลือกกลุ่มพนักงานที่มีสิทธิ์อย่างน้อย 1 กลุ่ม");
      return;
    }
    if (requiredDocuments.length === 0) {
      setError("เลือกเอกสารที่ต้องแนบอย่างน้อย 1 รายการ");
      return;
    }

    const benefit: BenefitRecord = {
      id: editingId || `benefit-${Date.now()}`,
      name: name.trim(),
      category,
      amount: quotaMode === "fixed"
        ? `${new Intl.NumberFormat("th-TH").format(Number(amount))} บาท`
        : quotaMode === "actual" ? "จ่ายตามจริง (ไม่มีเพดาน)" : `ตามแพ็กเกจ ${packageName.trim()}`,
      condition: `${condition.trim()} เอกสารที่ต้องแนบ: ${requiredDocuments.join(", ")}`,
      tiers: eligibleTiers,
      enabled: true,
    };

    try {
      if (editingId) {
        const saved = sessionStorage.getItem("benefit-records");
        const records: unknown = saved ? JSON.parse(saved) : null;
        if (!Array.isArray(records) || !records.every(isBenefitRecord) || !records.some((item) => item.id === editingId)) {
          setError("ไม่พบข้อมูลสวัสดิการที่ต้องการบันทึก");
          return;
        }
        const existing = records.find((item) => item.id === editingId);
        benefit.enabled = existing?.enabled !== false;
        sessionStorage.setItem(
          "benefit-records",
          JSON.stringify(records.map((item) => item.id === editingId ? benefit : item)),
        );
      } else {
        sessionStorage.setItem("new-benefit", JSON.stringify(benefit));
      }
      router.push("/hr/benefits");
    } catch {
      setError("ไม่สามารถบันทึกข้อมูลสวัสดิการได้");
    }
  }

  return (
    <div className="app-shell">
      <div className="app-main benefits-main">
        <div className="page-content benefits-content">
          <Breadcrumb className="breadcrumbs" items={[{ label: "หน้าหลัก", href: "/hr/home" }, { label: "ตั้งค่าสวัสดิการ", href: "/hr/benefits" }, { label: editingId ? "แก้ไขข้อมูลสวัสดิการ" : "เพิ่มสวัสดิการใหม่" }]} />
          <div className="benefit-form-heading">
            <h1>{editingId ? "แก้ไขข้อมูลสวัสดิการ" : "เพิ่มสวัสดิการใหม่"}</h1>
            <p>ช่องที่มีเครื่องหมาย <span>*</span> จำเป็นต้องระบุ</p>
          </div>

          <form className="benefit-form" onSubmit={saveBenefit}>
            <section className="benefit-form-card" aria-labelledby="benefit-basic-title">
              <h2 id="benefit-basic-title">ข้อมูลพื้นฐานสวัสดิการ</h2>
              <p className="benefit-form-subtitle">Basic Information</p>
              <div className="benefit-basic-grid">
                <label className="benefit-field">
                  <span>ชื่อสวัสดิการ <b>*</b></span>
                  <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="พิมพ์ชื่อสวัสดิการ เช่น ค่าของขวัญแต่งงาน..." />
                </label>
                <label className="benefit-field">
                  <span>ประเภทสวัสดิการ <b>*</b></span>
                  <select required value={category} onChange={(event) => setCategory(event.target.value)}>
                    {categories.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="benefit-field benefit-field-wide">
                  <span>รายละเอียด / เงื่อนไขการเบิกจ่าย <b>*</b></span>
                  <textarea required rows={5} value={condition} onChange={(event) => setCondition(event.target.value)} placeholder="พิมพ์ข้อความอธิบายเงื่อนไข เพื่อให้พนักงานอ่านตอนยื่นเรื่องเบิกจ่ายสวัสดิการ" />
                </label>
              </div>
            </section>

            <section className="benefit-form-card" aria-labelledby="benefit-quota-title">
              <h2 id="benefit-quota-title">การกำหนดวงเงินและงบประมาณ</h2>
              <p className="benefit-form-subtitle">Quota Settings</p>
              <div className="benefit-quota-grid">
                <fieldset className="benefit-field benefit-quota-modes">
                  <legend>รูปแบบวงเงิน <b>*</b></legend>
                  <label className="benefit-choice">
                    <input type="radio" name="quotaMode" checked={quotaMode === "fixed"} onChange={() => setQuotaMode("fixed")} />
                    <span>กำหนดเป็นจำนวนเงินคงที่</span>
                  </label>
                  <label className="benefit-choice">
                    <input type="radio" name="quotaMode" checked={quotaMode === "actual"} onChange={() => setQuotaMode("actual")} />
                    <span>จ่ายตามจริง (ไม่มีเพดาน)</span>
                  </label>
                  <label className="benefit-choice">
                    <input type="radio" name="quotaMode" checked={quotaMode === "package"} onChange={() => setQuotaMode("package")} />
                    <span>ตามแพ็กเกจ/ตารางคู่สัญญา</span>
                  </label>
                </fieldset>
                <div className="benefit-quota-fields">
                  {quotaMode === "fixed" ? (
                    <label className="benefit-field">
                      <span>จำนวนวงเงิน <b>*</b></span>
                      <input required type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} />
                      <small>ต่อคน</small>
                    </label>
                  ) : null}
                  {quotaMode === "package" ? (
                    <label className="benefit-field">
                      <span>ชื่อแพ็กเกจ / ตารางคู่สัญญา <b>*</b></span>
                      <input required value={packageName} onChange={(event) => setPackageName(event.target.value)} />
                    </label>
                  ) : null}
                  {quotaMode === "actual" ? (
                    <p className="benefit-quota-hint">พนักงานเบิกได้ตามค่าใช้จ่ายจริง โดยไม่มีการกำหนดเพดานวงเงิน</p>
                  ) : null}
                </div>
                <fieldset className="benefit-field benefit-document-options">
                  <legend>เอกสารที่ต้องแนบ <b>*</b></legend>
                  {documentOptions.map((document) => (
                    <label className="benefit-choice" key={document}>
                      <input type="checkbox" checked={requiredDocuments.includes(document)} onChange={() => toggleDocument(document)} />
                      <span>{document}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="benefit-field benefit-eligible-tiers">
                  <legend>กลุ่มพนักงานที่มีสิทธิ์ <b>*</b></legend>
                  {tiers.map((tier) => (
                    <label className="benefit-choice" key={tier}>
                      <input type="checkbox" checked={eligibleTiers.includes(tier)} onChange={() => toggleTier(tier)} />
                      <span>{tier}</span>
                    </label>
                  ))}
                </fieldset>
              </div>
            </section>

            {error ? <p className="benefit-form-error" role="alert">{error}</p> : null}
            <div className="benefit-form-actions">
              <Link href="/hr/benefits" className="button button-secondary">ยกเลิก</Link>
              <button type="submit" className="button button-primary">{!editingId ? <PlusIcon /> : null} {editingId ? "บันทึกการแก้ไข" : "บันทึกสวัสดิการ"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
