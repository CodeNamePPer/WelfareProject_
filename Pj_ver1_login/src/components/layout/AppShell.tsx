'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useToast } from '../ui/Toast';
import { cx } from '../../lib/cx';

interface AppShellProps {
  notificationCount: number;
  children: ReactNode;
}

export function AppShell({ notificationCount, children }: AppShellProps) {
  const pathname = usePathname();
  const { notifyPending } = useToast();
  // 768-1023px: collapsed by default (Style Guide). Below 768px the sidebar is a drawer.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar
        activeId={pathname === '/admin' ? 'home' : pathname?.startsWith('/admin/users') ? 'users' : ''}
        notificationCount={notificationCount}
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
          <span className="text-[15px] font-semibold">ระบบพนักงานและสวัสดิการ</span>
        </header>

        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
