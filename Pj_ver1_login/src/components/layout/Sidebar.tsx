'use client';

import Link from 'next/link';
import { ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { cx } from '../../lib/cx';
import { Spinner } from '../ui/Spinner';
import { NAV, type NavSection } from './navigation';

export interface SidebarUser {
  name: string;
  roleLabel: string;
}

interface SidebarProps {
  section: NavSection;
  hiddenNavIds?: string[];
  activeId: string;
  notificationCount: number;
  user: SidebarUser;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onNavigate: (label: string) => void;
}

export function Sidebar({
  section,
  hiddenNavIds,
  activeId,
  notificationCount,
  user,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onNavigate,
}: SidebarProps) {
  const config = NAV[section];
  const items = config.items(notificationCount).filter((item) => !hiddenNavIds?.includes(item.id));

  const hideWhenCollapsed = collapsed ? 'md:hidden' : '';
  const profileActive = activeId === 'profile';
  const userInitial = Array.from(user.name.trim())[0] ?? '?';

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
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
            <p className="text-15 leading-snug font-semibold text-ink">ระบบพนักงานและสวัสดิการ</p>
            <p className="text-11 text-muted">{config.subtitle}</p>
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

        <p className={cx('px-3 pb-1.5 text-11 font-semibold text-muted', hideWhenCollapsed)}>
          {config.sectionLabel}
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
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-13 font-semibold transition-colors motion-reduce:transition-none',
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
                      'ml-auto rounded-[9px] bg-primary-600 px-[7px] py-px text-11 font-medium text-white tabular-nums',
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

        {/* ผู้ที่เข้าระบบอยู่ – กดเพื่อดูโปรไฟล์ (ส่วนที่ยังไม่มีหน้าโปรไฟล์ แสดงเป็นข้อความเฉย ๆ) */}
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <ProfileLink
            href={config.profileHref}
            aria-current={profileActive ? 'page' : undefined}
            aria-label={config.profileHref ? `โปรไฟล์ของฉัน: ${user.name}, ${user.roleLabel}` : undefined}
            title={collapsed ? `${user.name} · ${user.roleLabel}` : undefined}
            onClick={onCloseMobile}
            className={cx(
              'group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors motion-reduce:transition-none',
              collapsed && 'md:justify-center md:px-0',
              profileActive ? 'bg-primary-100' : config.profileHref && 'hover:bg-primary-50',
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-13 font-semibold',
                profileActive ? 'bg-white text-primary-700' : 'bg-primary-50 text-primary-700 group-hover:bg-white',
              )}
            >
              {userInitial}
            </span>
            <span className={cx('min-w-0 flex-1 leading-tight', hideWhenCollapsed)}>
              <span className={cx('block truncate text-13 font-semibold', profileActive ? 'text-primary-700' : 'text-ink')}>
                {user.name}
              </span>
              <span className="block truncate text-11 text-muted">{user.roleLabel}</span>
            </span>
            {config.profileHref ? (
              <ChevronRight className={cx('size-4 shrink-0 text-muted', hideWhenCollapsed)} aria-hidden="true" />
            ) : null}
          </ProfileLink>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut || undefined}
            title={collapsed ? 'ออกจากระบบ' : undefined}
            className={cx(
              'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-13 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer disabled:cursor-wait disabled:opacity-80',
              collapsed && 'md:justify-center',
            )}
          >
            {loggingOut ? <Spinner /> : <LogOut className="size-4 shrink-0" aria-hidden="true" />}
            <span className={hideWhenCollapsed}>{loggingOut ? 'กำลังออกจากระบบ…' : 'ออกจากระบบ'}</span>
          </button>
        </div>
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

/** Profile page exists -> link to it. Otherwise the same block as plain, non-interactive text. */
function ProfileLink({ href, children, ...rest }: NavLinkProps & { children: ReactNode }) {
  if (href) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <div title={rest.title} className={rest.className}>
      {children}
    </div>
  );
}
