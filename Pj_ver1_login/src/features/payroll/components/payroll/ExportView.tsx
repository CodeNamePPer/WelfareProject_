"use client";

import { useState } from "react";
import { Button } from "@/features/payroll/components/ui/Button";
import { Card, SummaryStrip } from "@/features/payroll/components/ui/Card";
import { EmptyState } from "@/features/payroll/components/ui/EmptyState";
import { Field, Select } from "@/features/payroll/components/ui/Field";
import { Tabs } from "@/features/payroll/components/ui/Tabs";
import { useToast } from "@/features/payroll/components/ui/Toast";
import { downloadExcel } from "@/features/payroll/lib/export-excel";
import { REQUEST_EXPORT_COLUMNS } from "@/features/payroll/lib/export-columns";
import { ALL, filterRequests, ROUND_OPTIONS, statusOptions, sumBy, WELFARE_FILTER_OPTIONS } from "@/features/payroll/lib/filters";
import { formatBaht, formatNumber, formatThaiDate, THAI_MONTHS_FULL, THAI_MONTHS_SHORT, toBuddhistYear } from "@/features/payroll/lib/format";
import { useEffectiveRequests, useHydrated } from "@/features/payroll/lib/payroll-store";
import { ExportSkeleton } from "./PageSkeletons";
import type { PaymentRequest } from "@/features/payroll/lib/types";
import { BarChart, type BarDatum } from "./BarChart";

type Period = "day" | "month" | "year";

const pad = (n: number) => String(n).padStart(2, "0");
const yearOf = (r: PaymentRequest) => Number(r.payDate.slice(0, 4));
const monthOf = (r: PaymentRequest) => Number(r.payDate.slice(5, 7));

/**
 * จัดกลุ่มรายการเป็นแท่งกราฟตามช่วงเวลา (ใช้วันที่จ่ายเป็นหลัก)
 *   day   -> ทุกวันของเดือนที่เลือก
 *   month -> 12 เดือนของปีที่เลือก
 *   year  -> ทุกปีที่มีข้อมูล
 */
export function groupForChart(rows: PaymentRequest[], period: Period, year: number, month: number, allYears: number[]): BarDatum[] {
  const bucket = (match: (r: PaymentRequest) => boolean, label: string): BarDatum => {
    const items = rows.filter(match);
    return { label, value: sumBy(items, (r) => r.paidAmount), detail: `${formatNumber(items.length)} รายการ` };
  };
  if (period === "year") return allYears.map((y) => bucket((r) => yearOf(r) === y, String(toBuddhistYear(y))));
  if (period === "month") return THAI_MONTHS_SHORT.map((m, i) => bucket((r) => yearOf(r) === year && monthOf(r) === i + 1, m));
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const prefix = `${year}-${pad(month)}-`;
  return Array.from({ length: days }, (_, i) => bucket((r) => r.payDate === prefix + pad(i + 1), String(i + 1)));
}

/** หน้ารายงาน: ตัวกรองด้านซ้าย เปลี่ยนแล้วสรุป + กราฟด้านขวาอัปเดตทันที */
export function ExportView({ requests: rawRequests }: { requests: PaymentRequest[] }) {
  const hydrated = useHydrated(); // false = ยังไม่ได้อ่านค่าที่บันทึกไว้ใน browser
  const requests = useEffectiveRequests(rawRequests); // วันจ่ายตามการตั้งค่า / การเลื่อน
  const toast = useToast();
  const years = [...new Set(requests.map(yearOf))].sort((a, b) => b - a);
  const [filter, setFilter] = useState({ round: ALL, welfare: ALL, year: String(years[0]), month: ALL, status: ALL });
  const [period, setPeriod] = useState<Period>("month");

  const year = Number(filter.year);
  // ขั้นที่ 1: กรองตาม รอบ / สวัสดิการ / สถานะ (ใช้กับกราฟ)
  const base = filterRequests(requests, { round: filter.round, welfare: filter.welfare, status: filter.status });
  // ขั้นที่ 2: กรองตาม ปี / เดือน เพิ่ม (ใช้กับตัวเลขสรุปและไฟล์ Export)
  const scoped = base.filter((r) => yearOf(r) === year && (filter.month === ALL || monthOf(r) === Number(filter.month)));

  // เดือนสำหรับกราฟรายวัน: เดือนที่เลือก หรือเดือนล่าสุดที่มีข้อมูลของปีนั้น
  const dayMonth = filter.month !== ALL ? Number(filter.month) : Math.max(1, ...base.filter((r) => yearOf(r) === year).map(monthOf));
  const chart = groupForChart(base, period, year, dayMonth, [...years].reverse());

  const periodText =
    filter.month === ALL
      ? `${formatThaiDate(`${year}-01-01`)} - ${formatThaiDate(`${year}-12-31`)}`
      : `${formatThaiDate(`${year}-${pad(Number(filter.month))}-01`)} - ${formatThaiDate(
          `${year}-${pad(Number(filter.month))}-${new Date(Date.UTC(year, Number(filter.month), 0)).getUTCDate()}`,
        )}`;
  const chartCaption =
    period === "day"
      ? `รายวัน · ${THAI_MONTHS_FULL[dayMonth - 1]} ${toBuddhistYear(year)}`
      : period === "month"
        ? `รายเดือน · ปี ${toBuddhistYear(year)}`
        : "รายปี · ทุกปีที่มีข้อมูล";

  const update = (key: keyof typeof filter) => (e: { target: { value: string } }) => setFilter((f) => ({ ...f, [key]: e.target.value }));

  function exportExcel() {
    if (scoped.length === 0) {
      toast("ไม่มีข้อมูลตามตัวกรองที่เลือก", "error");
      return;
    }
    const monthPart = filter.month === ALL ? "ทั้งปี" : THAI_MONTHS_SHORT[Number(filter.month) - 1];
    downloadExcel(`รายงานสวัสดิการ-${toBuddhistYear(year)}-${monthPart}`, REQUEST_EXPORT_COLUMNS, scoped);
    toast(`ส่งออก ${formatNumber(scoped.length)} รายการแล้ว`);
  }

  // ยังไม่ได้อ่านการตั้งค่าที่บันทึกไว้: แสดง skeleton ก่อน (กันวันจ่ายเริ่มต้นแว้บแล้วเปลี่ยน)
  if (!hydrated) return <ExportSkeleton />;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
      {/* ตัวกรอง */}
      <Card className="flex flex-col gap-4 p-5 lg:sticky lg:top-24">
        <h2 className="text-14 font-semibold">ตัวกรองข้อมูล</h2>
        <Field label="รอบ">{(id) => <Select id={id} options={ROUND_OPTIONS} value={filter.round} onChange={update("round")} />}</Field>
        <Field label="สวัสดิการ">{(id) => <Select id={id} options={WELFARE_FILTER_OPTIONS} value={filter.welfare} onChange={update("welfare")} />}</Field>
        <Field label="ปี">
          {(id) => <Select id={id} options={years.map((y) => ({ value: String(y), label: String(toBuddhistYear(y)) }))} value={filter.year} onChange={update("year")} />}
        </Field>
        <Field label="เดือน">
          {(id) => (
            <Select
              id={id}
              options={[{ value: ALL, label: "ทุกเดือน" }, ...THAI_MONTHS_FULL.map((m, i) => ({ value: String(i + 1), label: m }))]}
              value={filter.month}
              onChange={update("month")}
            />
          )}
        </Field>
        <Field label="ประเภทรายงาน">
          {(id) => <Select id={id} options={statusOptions(["pending", "paid"], "ทั้งหมด")} value={filter.status} onChange={update("status")} />}
        </Field>
        <Button icon="download" onClick={exportExcel} className="mt-2">
          Export Excel
        </Button>
      </Card>

      {/* สรุปรายงาน */}
      <Card className="flex min-w-0 flex-col gap-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-14 font-semibold">สรุปรายงาน</h2>
          <Tabs
            label="ช่วงเวลาของกราฟ"
            value={period}
            onChange={setPeriod}
            tabs={[
              { value: "day", label: "รายวัน" },
              { value: "month", label: "รายเดือน" },
              { value: "year", label: "รายปี" },
            ]}
          />
        </div>

        <SummaryStrip
          className="bg-surface"
          items={[
            { label: "จำนวนรายการทั้งหมด", value: formatNumber(scoped.length), note: "รายการ" },
            { label: "ยอดรวมการจ่าย", value: formatBaht(sumBy(scoped, (r) => r.paidAmount), false), note: periodText },
            { label: "จำนวนพนักงาน", value: formatNumber(new Set(scoped.map((r) => r.employeeId)).size), note: "คน" },
          ]}
        />

        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-13 font-semibold">สรุปยอดรายจ่าย (บาท)</h3>
            <p className="text-12 text-muted">{chartCaption}</p>
          </div>
          {chart.every((d) => d.value === 0) ? (
            <EmptyState title="ไม่มีข้อมูลในช่วงนี้" />
          ) : (
            <BarChart data={chart} title={`สรุปยอดรายจ่าย ${chartCaption}`} formatValue={(v) => formatBaht(v, false)} />
          )}
        </div>
      </Card>
    </div>
  );
}
