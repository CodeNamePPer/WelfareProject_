'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isAdminDesignC } from '@/components/layout/navigation';

// หน้าของ Admin ที่ใช้ดีไซน์ C ต้องอยู่ใต้ .hr-app เพื่อให้ hr.css มีผล (หน้าอื่นของ Admin ไม่โดน)
export function AdminContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className={isAdminDesignC(pathname) ? 'hr-app pb-[72px]' : 'pb-[72px]'}>{children}</div>;
}
