"use client";

import { useState } from "react";
import { PAGE_SIZE } from "./constants";

/**
 * Hook แบ่งหน้าข้อมูล
 * รับ array ทั้งหมด -> คืนเฉพาะรายการของหน้าปัจจุบัน + ข้อมูลที่ <Pagination> ต้องใช้
 *
 * ใช้:  const { pageItems, pagination } = usePagination(filteredRows);
 *       ...
 *       <Pagination {...pagination} />
 */
export function usePagination<T>(items: T[], pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  // ถ้ากรองแล้วรายการน้อยลงจนหน้าปัจจุบันเกิน ให้ถอยมาหน้าสุดท้ายเอง
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return {
    pageItems,
    setPage,
    pagination: {
      page: current,
      totalPages,
      total: items.length,
      from: items.length === 0 ? 0 : start + 1,
      to: start + pageItems.length,
      onPageChange: setPage,
    },
  };
}
