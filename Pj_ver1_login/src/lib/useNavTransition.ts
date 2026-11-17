'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useTransition } from 'react';
import { finishNavigationProgress, startNavigationProgress } from '@/components/ui/NavigationProgress';

/**
 * เปลี่ยนหน้า/โหลดข้อมูลใหม่หลังบันทึก โดยให้ผู้ใช้เห็นว่ายังทำงานอยู่
 * - ห่อ router.push / router.refresh ด้วย startTransition: isPending ค้างจนหน้าใหม่ (หรือข้อมูลใหม่) แสดงจริง
 *   ปุ่มจึงยัง "กำลังบันทึก..." อยู่ ไม่กลับมากดได้ทั้งที่หน้ายังเป็นของเก่า
 * - เริ่มแถบโหลดด้านบน (NavigationProgress) ทันที เพราะแถบดักได้แค่การคลิกลิงก์
 */
export function useNavTransition() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const running = useRef(false);

  useEffect(() => {
    if (isPending || !running.current) return;
    running.current = false;
    finishNavigationProgress();
  }, [isPending]);

  const run = useCallback((work: () => void) => {
    running.current = true;
    startNavigationProgress();
    startTransition(work);
  }, []);

  /** ไปหน้าใหม่; refresh: true เมื่อข้อมูลฝั่งเซิร์ฟเวอร์เพิ่งเปลี่ยน (ไม่ใช้ของในแคช) */
  const navigate = useCallback(
    (href: string, { refresh = false }: { refresh?: boolean } = {}) =>
      run(() => {
        router.push(href);
        if (refresh) router.refresh();
      }),
    [router, run],
  );

  /** โหลดข้อมูลหน้าปัจจุบันใหม่ */
  const refresh = useCallback(() => run(() => router.refresh()), [router, run]);

  /** โหลดหน้าล่วงหน้า (เช่นตอนเอาเมาส์ชี้แถว) ให้คลิกแล้วเปิดได้ทันที */
  const prefetch = useCallback((href: string) => router.prefetch(href), [router]);

  return { isPending, navigate, refresh, prefetch };
}
