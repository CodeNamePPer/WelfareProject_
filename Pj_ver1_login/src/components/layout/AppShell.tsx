'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { SidebarUser } from './Sidebar';
import { activeNavId, type NavSection } from './navigation';
import { useToast } from '../ui/Toast';
import { cx } from '../../lib/cx';

interface AppShellProps {
  /** Which menu the sidebar shows (see navigation.ts). */
  section?: NavSection;
  /** Menu ids this user should not see (Style Guide: hide, don't disable). */
  hiddenNavIds?: string[];
  notificationCount: number;
  user: SidebarUser;
  children: ReactNode;
}

const DESIGN_C: NavSection[] = ['employee', 'hr', 'hr_head'];
// HR และหัวหน้า HR: เนื้อหาคอลัมน์เดียว กว้างสุด 1140px จัดกลาง (สเปกรีดีไซน์ HR)
const HR_COLUMN: NavSection[] = ['hr', 'hr_head'];

export function AppShell({ section = 'admin', hiddenNavIds, notificationCount, user, children }: AppShellProps) {
  const pathname = usePathname();
  const { notifyPending } = useToast();
  // 768-1023px: collapsed by default (Style Guide). Below 768px the sidebar is a drawer.
  // Read the viewport after mount so the server HTML and first client render match (no hydration mismatch).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setCollapsed(true);
  }, []);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    // ส่วนที่สร้างจากดีไซน์ "แบบ C" (ผู้ส่งคำขอและ HR): ระยะห่างเท่าดีไซน์ (ดู tailwind.config.ts) และพื้นหลัง #F3F4F6
    <div
      className={cx('min-h-screen', DESIGN_C.includes(section) && 'bg-[#F3F4F6]')}
      style={DESIGN_C.includes(section) ? ({ '--sp': 'calc(1rem * 16 / 14)' } as CSSProperties) : undefined}
    >
      <Sidebar
        section={section}
        hiddenNavIds={hiddenNavIds}
        activeId={activeNavId(section, pathname)}
        notificationCount={notificationCount}
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
        onNavigate={notifyPending}
      />

      <div
        className={cx(
          'transition-[padding] duration-200 motion-reduce:transition-none',
          collapsed ? 'md:pl-[72px]' : 'md:pl-[260px]',
        )}
      >
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-ink hover:bg-primary-50"
            aria-label="เปิดเมนู"
            aria-expanded={mobileOpen}
            aria-controls="app-sidebar"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <span className="text-15 font-semibold">ระบบพนักงานและสวัสดิการ</span>
        </header>

        {/* Collapsing the sidebar frees 188px (260 → 72); widen the cap by the same amount so the
            content takes that space instead of leaving wider empty gutters on both sides. */}
        <main
          className={cx(
            'mx-auto w-full px-4 py-6 sm:px-6 lg:px-8',
            // ดีไซน์แบบ C เว้นขอบบน 24px ล่าง 40px ส่วน Admin คง 32px เดิม
            DESIGN_C.includes(section) ? 'lg:pb-10' : 'lg:py-8',
            HR_COLUMN.includes(section) ? 'max-w-[1140px]' : collapsed ? 'max-w-[1628px]' : 'max-w-[1440px]',
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
