import type { CSSProperties } from "react";

/** แถบเทากระพริบระหว่างโหลด (Style Guide ข้อ 6.2) */
export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

