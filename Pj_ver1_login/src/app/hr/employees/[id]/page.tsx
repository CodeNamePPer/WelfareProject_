import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getHrEmployees, type HrEmployee } from "@/lib/hr/employees";
import { getEntitlements } from "@/lib/hr/entitlements";
import { formatThaiDate } from "@/lib/format";
import { pendingRequests } from "../../sample/queue";
import { approvedRequests } from "../../sample/approved";
import { rejectedRequests } from "../../sample/rejected";
import { revisionRequests } from "../../sample/revision";
import { thaiShortDateToIso } from "../../sample/history";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  return { title: `พนักงาน ${decodeURIComponent(id)}` };
}

const baht = new Intl.NumberFormat("th-TH");

/** อายุงานแบบอ่านง่าย เช่น "3 ปี 2 เดือน" นับถึงวันนี้หรือวันที่พ้นสภาพ */
function tenure(hireIso: string, endIso: string | null) {
  const start = new Date(`${hireIso}T00:00:00`);
  const end = endIso ? new Date(`${endIso}T00:00:00`) : new Date();
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  if (months < 1) return "ไม่ถึง 1 เดือน";
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return [years ? `${years} ปี` : "", rest ? `${rest} เดือน` : ""].filter(Boolean).join(" ");
}

type HistoryItem = { id: string; benefit: string; amount: number; date: string; status: string; tone: string };

/** คำขอทั้งหมดของพนักงานคนนี้จากข้อมูลตัวอย่างทุกสถานะ ใหม่สุดก่อน */
function requestHistory(code: string): HistoryItem[] {
  const items: HistoryItem[] = [
    ...pendingRequests.filter((r) => r.employeeCode === code).map((r) => ({ id: r.id, benefit: r.benefit, amount: r.amount, date: r.submitted, status: "รอตรวจ", tone: "pending" })),
    ...revisionRequests.filter((r) => r.employeeId === code).map((r) => ({ id: r.requestId, benefit: r.benefit, amount: r.amount, date: thaiShortDateToIso(r.submittedAt), status: "รอพนักงานแก้ไข", tone: "revision" })),
    ...rejectedRequests.filter((r) => r.employeeId === code).map((r) => ({ id: r.requestId, benefit: r.benefit, amount: r.amount, date: thaiShortDateToIso(r.rejectedAt), status: "ปฏิเสธแล้ว", tone: "rejected" })),
    ...approvedRequests.filter((r) => r.employeeId === code).map((r) => ({ id: r.requestId, benefit: r.benefit, amount: r.amount, date: thaiShortDateToIso(r.approvedAt), status: "อนุมัติแล้ว", tone: "approved" })),
  ];
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function EmployeeLink({ employee }: { employee: { code: string; name: string } }) {
  return <Link className="queue-name-link" href={`/hr/employees/${encodeURIComponent(employee.code)}`}>{employee.name}</Link>;
}

export default async function EmployeeProfilePage({ params }: { params: Params }) {
  const { id } = await params;
  const code = decodeURIComponent(id);
  const employees = await getHrEmployees();

  if (employees === null) {
    return (
      <div className="page-content queue-page">
        <p className="queue-alert" role="alert">โหลดข้อมูลพนักงานไม่สำเร็จ กรุณารีเฟรชหน้าอีกครั้ง</p>
      </div>
    );
  }

  const employee = employees.find((item) => item.code === code);
  if (!employee) notFound();

  const directReports: HrEmployee[] = employees.filter((item) => item.manager?.code === code);
  const entitlementResult = await getEntitlements(employee);
  const entitlements = entitlementResult?.items ?? null;
  const eligibleCount = entitlements?.filter((item) => item.eligible).length ?? 0;
  const history = requestHistory(code);
  const approvedTotal = history.filter((item) => item.tone === "approved").reduce((sum, item) => sum + item.amount, 0);
  const endDate = employee.status === "ACTIVE" ? null : employee.statusDate;

  return (
    <div className="page-content queue-page profile-page">
      <nav className="profile-breadcrumb" aria-label="ตำแหน่งหน้า">
        <Link href="/hr/employees">รายชื่อพนักงาน</Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{employee.code}</span>
      </nav>

      <header className="queue-heading">
        <h1>{employee.name}</h1>
        <ul className="queue-summary">
          <li>{employee.code}</li>
          <li><span className={`employment-status ${employee.status.toLowerCase()}`}>{employee.statusLabel}</span></li>
          {employee.status !== "ACTIVE" ? <li>ไม่มีสิทธิ์เบิกสวัสดิการ</li> : null}
        </ul>
      </header>

      <section className="queue-sheet profile-sheet" aria-labelledby="profile-work">
        <h2 id="profile-work">ข้อมูลการทำงาน</h2>
        <dl className="profile-facts">
          <Fact label="ฝ่าย / แผนก">
            {employee.department ? (
              <>{employee.parentDepartment ? `${employee.parentDepartment} › ` : ""}{employee.department}</>
            ) : <span className="queue-meta-danger">ยังไม่ระบุ</span>}
          </Fact>
          <Fact label="ตำแหน่ง">
            {employee.position ?? <span className="queue-meta-danger">ยังไม่ระบุ</span>}
            {employee.jobLevel ? <span className="queue-meta">{employee.jobLevel}</span> : null}
          </Fact>
          <Fact label="หัวหน้าโดยตรง">
            {employee.manager ? <EmployeeLink employee={employee.manager} /> : "—"}
          </Fact>
          <Fact label="ลูกน้องโดยตรง">
            {directReports.length > 0 ? (
              <ul className="profile-list">
                {directReports.map((report) => (
                  <li key={report.code}>
                    <EmployeeLink employee={report} />
                    {report.status !== "ACTIVE" ? <span className="queue-meta-inline"> · {report.statusLabel}</span> : null}
                  </li>
                ))}
              </ul>
            ) : "—"}
          </Fact>
          <Fact label="วันเริ่มงาน">
            {formatThaiDate(employee.hireDate)}
            <span className="queue-meta">อายุงาน {tenure(employee.hireDate, endDate)}</span>
          </Fact>
          <Fact label="สถานะ">
            {employee.statusLabel}
            {employee.statusDate ? <span className="queue-meta">ตั้งแต่ {formatThaiDate(employee.statusDate)}</span> : null}
          </Fact>
          <Fact label="อีเมล">
            {employee.email.endsWith(".invalid") ? <span className="queue-meta-danger">ไม่มีอีเมลจริง</span> : employee.email}
          </Fact>
        </dl>
      </section>

      <section className="queue-sheet" aria-labelledby="profile-entitlements">
        <div className="profile-sheet-head">
          <h2 id="profile-entitlements">สิทธิสวัสดิการ</h2>
          <p className="queue-meta">
            {entitlements === null
              ? "โหลดข้อมูลสวัสดิการไม่สำเร็จ"
              : `มีสิทธิ์ ${eligibleCount} จาก ${entitlements.length} รายการ · จากตารางสวัสดิการ · ยอดที่ใช้ไปจะแสดงเมื่อเชื่อมระบบคำขอเบิก`}
          </p>
        </div>
        {entitlements && entitlements.length > 0 ? (
          <div className="queue-table-scroll">
            <table className="queue-table">
              <thead>
                <tr>
                  <th scope="col">สวัสดิการ</th>
                  <th scope="col" className="queue-num">วงเงิน</th>
                  <th scope="col">จำนวนครั้ง</th>
                  <th scope="col" className="queue-num">ใช้ไปแล้ว</th>
                  <th scope="col">สิทธิ์</th>
                </tr>
              </thead>
              <tbody>
                {entitlements.map((item) => (
                  <tr key={item.code} className={item.eligible ? undefined : "profile-row-muted"}>
                    <td data-label="สวัสดิการ">
                      <span className="queue-item">{item.name}</span>
                      <span className="queue-meta">{item.code}</span>
                    </td>
                    <td data-label="วงเงิน" className="queue-num">
                      {item.limit !== null ? <span className="queue-amount">{baht.format(item.limit)} บาท</span> : <span className="queue-meta">ยังไม่กำหนด</span>}
                      <span className="queue-meta">{item.budget}</span>
                      {item.nextLimit ? <span className="queue-meta">{baht.format(item.nextLimit.amount)} บาท ตั้งแต่ {formatThaiDate(item.nextLimit.from)}</span> : null}
                    </td>
                    <td data-label="จำนวนครั้ง">
                      {item.claims}
                    </td>
                    <td data-label="ใช้ไปแล้ว" className="queue-num"><span className="queue-meta">ยังไม่มีข้อมูล</span></td>
                    <td data-label="สิทธิ์">
                      <span className={`request-status request-status-${item.eligible ? "approved" : "rejected"}`}>{item.eligible ? "มีสิทธิ์" : "ไม่มีสิทธิ์"}</span>
                      {item.note ? <span className="queue-meta">{item.note}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="queue-sheet" aria-labelledby="profile-requests">
        <div className="profile-sheet-head">
          <h2 id="profile-requests">คำขอสวัสดิการ</h2>
          <p className="queue-meta">
            ข้อมูลตัวอย่าง · {history.length} รายการ{approvedTotal > 0 ? ` · อนุมัติแล้วรวม ${baht.format(approvedTotal)} บาท` : ""}
          </p>
        </div>
        <div className="queue-table-scroll">
          <table className="queue-table">
            <thead>
              <tr>
                <th scope="col">คำขอ</th>
                <th scope="col" className="queue-num">ยอดเบิก</th>
                <th scope="col">สถานะ</th>
                <th scope="col">วันที่</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={`${item.tone}-${item.id}`}>
                  <td data-label="คำขอ">
                    <span className="queue-item">{item.benefit}</span>
                    <span className="queue-meta">{item.id}</span>
                  </td>
                  <td data-label="ยอดเบิก" className="queue-num">{item.amount > 0 ? <span className="queue-amount">{baht.format(item.amount)} บาท</span> : <span className="queue-meta">—</span>}</td>
                  <td data-label="สถานะ"><span className={`request-status request-status-${item.tone}`}>{item.status}</span></td>
                  <td data-label="วันที่" className="queue-date-cell">{formatThaiDate(item.date)}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr><td className="queue-empty" colSpan={4}>ยังไม่มีคำขอสวัสดิการ</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
