"use client";

import { useState } from "react";

export interface BarDatum {
  label: string; // ป้ายแกน X เช่น "ม.ค."
  value: number; // ความสูงแท่ง
  detail?: string; // ข้อความเพิ่มใน tooltip เช่น "12 รายการ"
}

/**
 * หาค่าสูงสุดของแกน Y ที่เป็นเลขกลมๆ และระยะห่างเส้นตาราง
 * เช่น max = 61,800 -> { top: 80,000, step: 20,000 }  (แบ่ง 4 ช่อง)
 */
export function niceScale(max: number, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const rough = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const norm = rough / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return { top: step * ticks, step };
}

/** ย่อตัวเลขบนแกน: 20000 -> "20k" */
function shortNumber(n: number) {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${+(n / 1000).toFixed(1)}k`;
  return String(n);
}

/**
 * กราฟแท่งชุดข้อมูลเดียว (ทำด้วย HTML/CSS ไม่ต้องใช้ไลบรารี)
 *   - ชี้/โฟกัสแท่ง -> แสดง tooltip ค่าจริง
 *   - มีตารางซ่อนไว้ให้ screen reader อ่านตัวเลขได้
 */
export function BarChart({ data, formatValue, title }: { data: BarDatum[]; formatValue: (v: number) => string; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const { top, step } = niceScale(Math.max(0, ...data.map((d) => d.value)));
  const gridLines = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // จำนวนแท่งเยอะ (รายวัน) -> แสดงป้ายแกน X ทุกๆ n แท่ง
  const labelEvery = data.length > 16 ? Math.ceil(data.length / 10) : 1;

  return (
    <figure className="w-full pt-6">
      <div className="relative flex h-64 gap-2">
        {/* แกน Y */}
        <div className="relative w-10 shrink-0 text-right text-[12px] text-muted">
          {gridLines.map((v) => (
            <span key={v} className="num absolute right-0 -translate-y-1/2" style={{ bottom: `${(v / top) * 100}%` }}>
              {shortNumber(v)}
            </span>
          ))}
        </div>

        {/* พื้นที่กราฟ */}
        <div className="relative flex-1">
          {gridLines.map((v) => (
            <div key={v} className={`absolute inset-x-0 border-t ${v === 0 ? "border-muted/40" : "border-line"}`} style={{ bottom: `${(v / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div key={d.label} className="relative flex h-full flex-1 items-end justify-center">
                {/* ปุ่มใสเต็มคอลัมน์ = พื้นที่ชี้ใหญ่กว่าตัวแท่ง ชี้ง่าย */}
                <button
                  type="button"
                  className="absolute inset-0 focus-visible:outline-none"
                  aria-label={`${d.label}: ${formatValue(d.value)}${d.detail ? `, ${d.detail}` : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
                <div
                  className={`pointer-events-none w-full max-w-7 rounded-t-[4px] transition-colors ${active === i ? "bg-primary-700" : "bg-primary-600"}`}
                  style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value > 0 ? 2 : 0 }}
                />
                {active === i && (
                  <div className="pointer-events-none absolute bottom-full z-10 mb-2 rounded-lg border border-line bg-white px-3 py-2 text-[12px] whitespace-nowrap shadow-lg">
                    <p className="text-muted">{d.label}</p>
                    <p className="num text-12 font-semibold text-ink">{formatValue(d.value)}</p>
                    {d.detail && <p className="text-muted">{d.detail}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* แกน X */}
      <div className="mt-2 flex gap-2">
        <div className="w-10 shrink-0" />
        <div className="flex flex-1 gap-[2px]">
          {data.map((d, i) => (
            <span key={d.label} className="num flex-1 truncate text-center text-[12px] text-muted">
              {i % labelEvery === 0 ? d.label : ""}
            </span>
          ))}
        </div>
      </div>

      {/* ตารางสำหรับ screen reader */}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>{formatValue(d.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
