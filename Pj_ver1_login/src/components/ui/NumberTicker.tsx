'use client';

import { useEffect, useRef } from 'react';
import { useInView, useMotionValue, useReducedMotion, useSpring } from 'motion/react';
import { cx } from '../../lib/cx';

// Adapted from Magic UI "Number Ticker" (https://magicui.design/docs/components/number-ticker).
// Counts up from 0 once it scrolls into view. Screen readers get the final value only,
// and users who prefer reduced motion see the final value straight away.
export function NumberTicker({
  value,
  delay = 0,
  className,
}: {
  value: number;
  /** Seconds to wait before counting. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 60, stiffness: 100 });
  const isInView = useInView(ref, { once: true });
  const format = (n: number) => Math.round(n).toLocaleString('th-TH');

  useEffect(() => {
    if (!isInView || reduceMotion) return;
    const timer = setTimeout(() => motionValue.set(value), delay * 1000);
    return () => clearTimeout(timer);
  }, [motionValue, isInView, reduceMotion, delay, value]);

  useEffect(
    () =>
      springValue.on('change', (latest) => {
        if (ref.current) ref.current.textContent = format(latest);
      }),
    [springValue],
  );

  return (
    <span className={cx('inline-block tabular-nums', className)}>
      <span ref={ref} aria-hidden="true">
        {reduceMotion ? format(value) : format(0)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
