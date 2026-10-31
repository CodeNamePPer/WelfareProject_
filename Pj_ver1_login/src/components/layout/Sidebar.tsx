'use client';

import Link from 'next/link';
import {
  Bell,
  FilePlus2,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCog,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AnchorHTMLAttributes } from 'react';
import { cx } from '../../lib/cx';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  href?: string;
}

interface SidebarProps {
  activeId: string;
  notificationCount: number;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (label: string) => void;
}

export function Sidebar({
  activeId,
  notificationCount,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
}: SidebarProps) {
  const items: NavItem[] = [
    { id: 'home', label: 'หน้าแรก Home', icon: LayoutDashboard, href: '/admin' },
    { id: 'notifications', label: 'แจ้งเตือน', icon: Bell, badge: notificationCount, href: '/admin/notifications' },
    { id: 'benefits', label: 'จัดการสวัสดิการ', icon: Gift, href: '/admin/benefits' },
    { id: 'users', label: 'ตั้งค่าผู้ใช้งานระบบ', icon: UserCog, href: '/admin/users' },
    { id: 'logs', label: 'ประวัติการแก้ไข Log', icon: History, href: '/admin/logs' },
    { id: 'requests', label: 'ส่งคำขอสวัสดิการ', icon: FilePlus2 },
  ];

  const hideWhenCollapsed = collapsed ? 'md:hidden' : '';

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  return (
    <>
      {mobileOpen ? (
        <div className="fixed inset-0 z-30 bg-ink/40 md:hidden" onClick={onCloseMobile} aria-hidden="true" />
      ) : null}

      <aside
        id="app-sidebar"
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col gap-1 border-r border-line bg-white px-4 py-6',
          'transition-[width,transform] duration-200 motion-reduce:transition-none',
          collapsed ? 'md:w-[72px] md:px-3' : 'md:w-[260px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className={cx('flex items-center gap-2 px-1 pb-5', collapsed && 'md:justify-center md:px-0')}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-primary-50 md:inline-flex"
            aria-label={collapsed ? 'ขยายเมนู' : 'ย่อเมนู'}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className={cx('min-w-0 flex-1 leading-tight', hideWhenCollapsed)}>
            <p className="text-[15px] leading-snug font-semibold text-ink">ระบบพนักงานและสวัสดิการ</p>
            <p className="text-[11px] text-muted">Admin</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-primary-50 md:hidden"
            aria-label="ปิดเมนู"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <p className={cx('px-3 pb-1.5 text-[11px] font-semibold text-muted', hideWhenCollapsed)}>
          ADMIN
        </p>

        <nav aria-label="เมนูหลัก" className="flex flex-col gap-1">
          {items.map(({ id, label, icon: Icon, badge, href }) => {
            const active = id === activeId;
            return (
              <NavLink
                key={id}
                href={href}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
                onClick={(event) => {
                  if (!href) {
                    event.preventDefault();
                    onNavigate(label);
                  }
                  onCloseMobile();
                }}
                className={cx(
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] font-semibold transition-colors motion-reduce:transition-none',
                  collapsed && 'md:justify-center',
                  active
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-ink hover:bg-primary-50',
                )}
              >
                <span className="relative inline-flex">
                  <Icon className={cx('size-4 shrink-0', active ? 'text-primary-600' : 'text-ink')} aria-hidden="true" />
                  {badge ? (
                    <span
                      className={cx(
                        'absolute -top-1.5 -right-1.5 hidden size-2 rounded-full bg-primary-600 ring-2 ring-white',
                        collapsed && 'md:block',
                      )}
                      aria-hidden="true"
                    />
                  ) : null}
                </span>
                <span className={cx('truncate', hideWhenCollapsed)}>{label}</span>
                {badge ? (
                  <span
                    className={cx(
                      'ml-auto rounded-[9px] bg-primary-600 px-[7px] py-px text-[11px] font-medium text-white tabular-nums',
                      hideWhenCollapsed,
                    )}
                  >
                    <span className="sr-only">ยังไม่อ่าน </span>
                    {badge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'ออกจากระบบ' : undefined}
          className={cx(
            'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-[13px] text-muted hover:bg-danger/10 hover:text-danger cursor-pointer',
            collapsed && 'md:justify-center',
          )}
        >
          <LogOut className="size-4 shrink-0" aria-hidden="true" />
          <span className={hideWhenCollapsed}>ออกจากระบบ</span>
        </button>
      </aside>
    </>
  );
}

interface NavLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href?: string;
}

/** Real route -> next/link (client-side navigation). No route yet -> inert anchor handled by onClick. */
function NavLink({ href, ...rest }: NavLinkProps) {
  return href ? <Link href={href} {...rest} /> : <a href="#" {...rest} />;
}
