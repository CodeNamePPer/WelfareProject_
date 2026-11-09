import { PageHeader } from "@/features/payroll/components/layout/PageHeader";
import { ButtonLink } from "@/features/payroll/components/ui/Button";

/*
 * หัวหน้า (breadcrumb + ชื่อหน้า + คำอธิบาย) ของทุกหน้าใน Payroll
 * รวมไว้ที่เดียว เพราะต้องใช้ 2 ที่: page.tsx (หน้าจริง) และ loading.tsx (ระหว่างโหลด)
 * แก้ข้อความที่นี่ที่เดียว ทั้งสองที่เปลี่ยนตาม
 */

export function RoundsHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "รอบจ่าย" }]}
      title="ตั้งค่ารอบจ่าย / เลื่อนวันจ่าย"
      description="กำหนดรอบการจ่ายเงินสวัสดิการและตรวจสอบกำหนดจ่ายของแต่ละรอบ"
    />
  );
}

export function PaySettingsHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "รอบจ่าย", href: "/payroll/rounds" }, { label: "ตั้งค่าการจ่ายเงิน" }]}
      title="ตั้งค่ารอบจ่าย"
      description="กำหนดวันจ่ายของแต่ละรอบที่แถบด้านล่าง ดูกำหนดจ่ายรายคำขอและเลื่อนวันจ่ายได้ที่หน้าตั้งค่ารอบจ่าย / เลื่อนวันจ่าย"
    />
  );
}

export function ApprovalsHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "รายการ" }]}
      title="รายการอนุมัติ / รอจ่าย"
      description="ตรวจสอบรายการที่อนุมัติแล้วและสถานะการจ่าย คลิกที่รายการเพื่อดูรายละเอียด"
    />
  );
}

export function ApprovalDetailsHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "รายการ", href: "/payroll/approvals" }, { label: "ข้อมูลเพิ่มเติม" }]}
      title="รายการอนุมัติ / รอจ่าย"
      description="ตรวจสอบรายละเอียดคำขอ ข้อมูลการรักษา และข้อมูลบัญชีก่อนจ่ายเงิน"
      actions={
        <ButtonLink href="/payroll/approvals" variant="secondary" icon="chevronLeft">
          ย้อนกลับ
        </ButtonLink>
      }
    />
  );
}

/** หน้ารายละเอียดของคำขอ เปิดจากแถวในตารางรายการอนุมัติ / รอจ่าย */
export function ApprovalRequestHeader({ id }: { id: string }) {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "รายการ", href: "/payroll/approvals" }, { label: id }]}
      title="รายละเอียดคำขอ"
      description="ตรวจสอบข้อมูลคำขอและดำเนินการก่อนจ่ายเงิน"
    />
  );
}

export function ExportHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "ส่งออกรายงาน" }]}
      title="รายงานและส่งออกข้อมูล (Excel)"
      description="สรุปภาพรวมการจ่ายเงินสวัสดิการ พร้อมส่งออกข้อมูลสำหรับการตรวจสอบและวางแผนงบประมาณ"
    />
  );
}

export function HistoryHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "ประวัติ" }]}
      title="ประวัติการจ่ายเงินสวัสดิการ"
      description="ค้นหาและดูประวัติการจ่ายเงิน พร้อมตรวจสอบรายละเอียดของแต่ละรายการย้อนหลัง"
    />
  );
}

export function HistoryDetailsHeader() {
  return (
    <PageHeader
      crumbs={[{ label: "Payroll" }, { label: "ประวัติ", href: "/payroll/history" }, { label: "ข้อมูลเพิ่มเติม" }]}
      title="ประวัติการจ่ายเงินสวัสดิการ"
      description="ค้นหาและดูประวัติการจ่ายเงิน พร้อมตรวจสอบรายละเอียดของแต่ละรายการย้อนหลัง"
      actions={
        <ButtonLink href="/payroll/history" variant="secondary" icon="chevronLeft">
          ย้อนกลับ
        </ButtonLink>
      }
    />
  );
}
