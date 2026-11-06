'use client';

import { useEffect, useRef, useState } from 'react';
import { cx } from '../../lib/cx';

/** SkeletonScreen ใส่ attribute นี้ไว้: ถ้ายังมีโครงหน้าอยู่ (แม้ยังไม่แสดง) แถบจะไม่วิ่งไปสุด */
const ROUTE_LOADING_ATTR = 'data-route-loading';
/** keyframe ที่ SkeletonScreen ใช้ค่อยๆ แสดงตัว (tailwind.config.ts) – เริ่มเมื่อไหร่ แปลว่าผู้ใช้เริ่มเห็นโครงหน้า */
const SKELETON_IN_ANIMATION = 'skeleton-in';

const TRICKLE_MS = 200;
// กันแถบค้าง กรณีมีโค้ดอื่นยกเลิกการเปลี่ยนหน้าหลังเราเริ่มแถบไปแล้ว
const GIVE_UP_MS = 10_000;

// handoff: โครงหน้าขึ้นแล้ว ให้แถบจางหายไปเฉยๆ (ยังไม่เสร็จ จึงไม่วิ่งไปสุด) เหลือตัวบอกสถานะแค่อันเดียว
type Phase = 'idle' | 'loading' | 'done' | 'handoff';

function locationKey() {
  return window.location.pathname + window.location.search;
}

/**
 * แถบโหลดบางๆ ชิดขอบบนจอ ขึ้นทันทีที่กดลิงก์ภายในระบบ ใช้บอกช่วงแรกที่โครงหน้ายังหน่วงไม่แสดง
 * - หน้ามาเร็ว (ไม่เห็นโครงหน้า): วิ่งไปสุดแล้วจาง เมื่อ URL เปลี่ยนแล้ว
 * - หน้าช้า: พอโครงหน้าเริ่มแสดง แถบจางหายไปเลย ไม่ให้มีตัวโหลดสองอันพร้อมกัน
 */
export function NavigationProgress() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const startKey = useRef<string | null>(null);

  // เริ่ม: ดักคลิกลิงก์ในช่วง capture เพราะ next/link เรียก preventDefault เองในช่วง bubble
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!anchor || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const raw = anchor.getAttribute('href');
      if (!raw || raw.startsWith('#')) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === locationKey()) return;

      startKey.current = locationKey();
      setProgress(0.15);
      setPhase('loading');
    }

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // ระหว่างโหลด: ค่อยๆ ขยับเข้าใกล้ 90% และคอยดูว่าหน้าใหม่พร้อมหรือยัง
  useEffect(() => {
    if (phase !== 'loading') return;

    const finishIfReady = () => {
      const moved = locationKey() !== startKey.current;
      if (moved && !document.querySelector(`[${ROUTE_LOADING_ATTR}]`)) setPhase('done');
    };

    const trickle = window.setInterval(() => {
      setProgress((p) => p + (0.9 - p) * 0.15);
      finishIfReady();
    }, TRICKLE_MS);
    const observer = new MutationObserver(finishIfReady);
    observer.observe(document.body, { childList: true, subtree: true });
    const giveUp = window.setTimeout(() => setPhase('done'), GIVE_UP_MS);

    const onAnimationStart = (event: AnimationEvent) => {
      if (event.animationName === SKELETON_IN_ANIMATION) setPhase('handoff');
    };
    document.addEventListener('animationstart', onAnimationStart);

    return () => {
      window.clearInterval(trickle);
      window.clearTimeout(giveUp);
      observer.disconnect();
      document.removeEventListener('animationstart', onAnimationStart);
    };
  }, [phase]);

  // ส่งต่อให้โครงหน้า: จางหายตรงตำแหน่งเดิม
  useEffect(() => {
    if (phase !== 'handoff') return;
    const hide = window.setTimeout(() => {
      setPhase('idle');
      setProgress(0);
    }, 200);
    return () => window.clearTimeout(hide);
  }, [phase]);

  // จบ: วิ่งไปสุดแถบ แล้วค่อยจางหาย
  useEffect(() => {
    if (phase !== 'done') return;
    setProgress(1);
    const hide = window.setTimeout(() => {
      setPhase('idle');
      setProgress(0);
    }, 450);
    return () => window.clearTimeout(hide);
  }, [phase]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div
        className={cx(
          'h-full origin-left bg-primary-600',
          phase === 'loading' && 'opacity-100 transition-transform duration-200 ease-out motion-reduce:transition-none',
          // วิ่งไปสุดแถบก่อน แล้วค่อยจาง
          phase === 'done' &&
            'opacity-0 transition-[transform,opacity] duration-200 ease-out [transition-delay:0ms,200ms] motion-reduce:transition-none',
          phase === 'handoff' && 'opacity-0 transition-opacity duration-150 ease-out motion-reduce:transition-none',
          // รีเซ็ตกลับเป็น 0 ตอนมองไม่เห็นแล้ว ไม่ต้องเห็นแถบหดกลับ
          phase === 'idle' && 'opacity-0 transition-none',
        )}
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
}
