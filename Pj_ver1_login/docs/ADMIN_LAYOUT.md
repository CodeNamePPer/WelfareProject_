# โครงสร้าง Layout หน้า Admin

คู่มือสำหรับทีม: ทุกหน้าใต้ `/admin/*` ใช้ Layout ชุดเดียวกัน (Sidebar + พื้นที่เนื้อหา + Toast + ปุ่มทางลัด)
**สร้างหน้าใหม่ไม่ต้องใส่ Sidebar/Shell เอง** แค่วางไฟล์ `page.tsx` ไว้ใต้ `src/app/admin/` แล้ว Layout จะครอบให้อัตโนมัติ

Stack: Next.js App Router · Tailwind CSS · `lucide-react` (ไอคอน)

---

## 1. ภาพรวมโครงสร้าง

```
src/
├─ app/admin/
│  ├─ layout.tsx          ← ครอบทุกหน้า Admin (เช็กสิทธิ์ + AppShell + Toast + FAB)
│  ├─ page.tsx            ← /admin (หน้าแรก)
│  ├─ loading.tsx         ← skeleton ระหว่างโหลด
│  ├─ error.tsx           ← หน้าแสดงเมื่อเกิด error
│  └─ <เมนู>/
│     ├─ page.tsx         ← /admin/<เมนู>
│     └─ loading.tsx
├─ components/
│  ├─ layout/
│  │  ├─ AppShell.tsx     ← Sidebar + header มือถือ + <main>
│  │  └─ Sidebar.tsx      ← เมนูซ้าย (ย่อ/ขยาย, drawer บนมือถือ)
│  └─ ui/
│     ├─ PageHeader.tsx   ← หัวข้อหน้า (title + description + action)
│     └─ Toast.tsx        ← ToastProvider / useToast
├─ features/
│  ├─ dashboard/ui.tsx    ← Panel, PanelTitle, ItemCard
│  └─ shortcuts/ShortcutFab.tsx
└─ lib/cx.ts              ← รวม className แบบมีเงื่อนไข
```

```
┌──────────────┬─────────────────────────────────────────────┐
│ Sidebar      │ <main> max-w 1440 (1628 collapsed), px 16/24/32 │
│ 260px        │  ┌───────────────────────────────────────┐  │
│ (ย่อ = 72px)  │  │ PageHeader (title / description / action)│  │
│              │  └───────────────────────────────────────┘  │
│ - เมนู        │  ┌──────────┐ ┌──────────┐                 │
│ - badge      │  │ Panel    │ │ Panel    │  gap 24px        │
│              │  └──────────┘ └──────────┘                 │
│ ──────────── │                                             │
│ โปรไฟล์       │  (pb 72px เผื่อปุ่มทางลัด)              [FAB] │
│ ออกจากระบบ   │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

### Breakpoint

| ความกว้างจอ | Sidebar |
|---|---|
| `< 768px` | ซ่อน เป็น drawer เปิดจากปุ่ม ☰ ใน header ด้านบน |
| `768–1023px` | แสดงแบบย่อ (72px) เป็นค่าเริ่มต้น |
| `≥ 1024px` | แสดงเต็ม (260px) กดปุ่ม ☰ เพื่อย่อ/ขยายได้ |

---

## 2. Design tokens (จาก `tailwind.config.ts`)

ใช้ชื่อ token เหล่านี้แทนการใส่ค่าสีเอง เพื่อให้ทุกหน้าหน้าตาเหมือนกัน

| Token | ค่า | ใช้กับ |
|---|---|---|
| `bg-paper` | `#F6F7F9` | พื้นหลังทั้งหน้า (ตั้งไว้ที่ `body` แล้ว) |
| `bg-white` | `#FFFFFF` | Sidebar, Panel, การ์ด |
| `text-ink` | `#18253F` | ตัวอักษรหลัก |
| `text-muted` | `#5b6b82` | คำอธิบาย / ข้อความรอง |
| `border-line` | `#e2e8f0` | เส้นขอบทุกชนิด |
| `primary-50/100/600/700` | ฟ้า | hover / เมนูที่เลือก / badge |
| `danger` | `#B3261E` | ลบ / ออกจากระบบ |
| `status-*` | | สถานะคำขอ (pending / approved / rejected) |

**ขนาดตัวอักษร:** ใช้ `text-11` … `text-24` (หน่วยเป็น rem เทียบ 14px) เช่น

- หัวข้อหน้า `text-22 font-semibold`
- หัวข้อ Panel `text-16 font-semibold`
- เนื้อหา/เมนู `text-13`
- ป้าย/คำอธิบายเล็ก `text-11`

**ระยะห่างที่ใช้ซ้ำ:** ระหว่างส่วนในหน้า `gap-[24px]` · ใน Panel `gap-[16px]` · การ์ดย่อย `gap-[12px]`
**มุมโค้ง:** Panel `rounded-[10px]` · ปุ่ม/การ์ดเล็ก `rounded-[6px]`

---

## 3. โค้ด Layout

### 3.1 `src/app/admin/layout.tsx`

เช็ก session + role แล้วครอบทุกหน้าด้วย `AppShell`

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { AppShell } from "@/components/layout/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { ShortcutFab } from "@/features/shortcuts/ShortcutFab";
import { countUnread, getAdminAlerts } from "@/lib/admin/alerts";
import { ROLE_LABELS } from "@/lib/auth/roles";

// Shared by every Admin page: sidebar (with the signed-in user) + toast + floating shortcut button.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPER_ADMIN") {
    redirect("/access-denied?reason=role");
  }

  const unread = countUnread(await getAdminAlerts(session.sub));

  return (
    <ToastProvider>
      <AppShell notificationCount={unread} user={{ name: session.name, roleLabel: ROLE_LABELS[session.role] ?? session.role }}>
        {/* pb-[72px] เว้นที่ท้ายทุกหน้าไม่ให้ปุ่มทางลัดบังเนื้อหาส่วนล่าง */}
        <div className="pb-[72px]">{children}</div>
      </AppShell>
      <ShortcutFab notificationCount={unread} />
    </ToastProvider>
  );
}
```

### 3.2 `src/components/layout/AppShell.tsx`

```tsx
'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import type { SidebarUser } from './Sidebar';
import { useToast } from '../ui/Toast';
import { cx } from '../../lib/cx';

interface AppShellProps {
  notificationCount: number;
  user: SidebarUser;
  children: ReactNode;
}

export function AppShell({ notificationCount, user, children }: AppShellProps) {
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
        activeId={pathname === '/admin' ? 'home' : (pathname?.match(/^\/admin\/([^/]+)/)?.[1] ?? '')}
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

        <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
```

### 3.3 `src/components/layout/Sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import {
  Bell,
  ChevronRight,
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

export interface SidebarUser {
  name: string;
  roleLabel: string;
}

interface SidebarProps {
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
  activeId,
  notificationCount,
  user,
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
  const profileActive = activeId === 'profile';
  const userInitial = Array.from(user.name.trim())[0] ?? '?';

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
            <p className="text-15 leading-snug font-semibold text-ink">ระบบพนักงานและสวัสดิการ</p>
            <p className="text-11 text-muted">Admin</p>
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

        {/* ผู้ที่เข้าระบบอยู่ – กดเพื่อดูโปรไฟล์ */}
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          <Link
            href="/admin/profile"
            aria-current={profileActive ? 'page' : undefined}
            aria-label={`โปรไฟล์ของฉัน: ${user.name}, ${user.roleLabel}`}
            title={collapsed ? `${user.name} · ${user.roleLabel}` : undefined}
            onClick={onCloseMobile}
            className={cx(
              'group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors motion-reduce:transition-none',
              collapsed && 'md:justify-center md:px-0',
              profileActive ? 'bg-primary-100' : 'hover:bg-primary-50',
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
            <ChevronRight className={cx('size-4 shrink-0 text-muted', hideWhenCollapsed)} aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? 'ออกจากระบบ' : undefined}
            className={cx(
              'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-13 text-muted hover:bg-danger/10 hover:text-danger cursor-pointer',
              collapsed && 'md:justify-center',
            )}
          >
            <LogOut className="size-4 shrink-0" aria-hidden="true" />
            <span className={hideWhenCollapsed}>ออกจากระบบ</span>
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
```

### 3.4 Component ย่อยที่ใช้ในทุกหน้า

`src/lib/cx.ts`

```ts
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
```

`src/components/ui/PageHeader.tsx`

```tsx
import type { ReactNode } from 'react';

// Page title block shared by the Admin pages – Figma "Page header" (22px semibold + 13px muted).
export function PageHeader({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-22 font-semibold text-ink">{title}</h1>
        {description ? <p className="text-13 text-muted">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
```

`Panel` / `PanelTitle` (อยู่ใน `src/features/dashboard/ui.tsx`)

```tsx
export function Panel({ children, className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cx('flex min-w-0 flex-col gap-[16px] rounded-[10px] border border-line bg-white p-[14px] sm:p-[20px]', className)} {...rest}>
      {children}
    </section>
  );
}

export function PanelTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-16 font-semibold text-ink">
      {children}
    </h2>
  );
}
```

> ไฟล์อื่นที่ Layout ต้องใช้ (copy จาก repo ได้เลย): `src/components/ui/Toast.tsx`, `src/features/shortcuts/ShortcutFab.tsx`,
> `src/lib/auth/get-session.ts`, `src/lib/auth/roles.ts`, `src/lib/admin/alerts.ts`, `src/components/Skeleton.tsx`

---

## 4. Template สร้างหน้า Admin ใหม่

ตัวอย่าง: หน้า `/admin/reports`

### 4.1 `src/app/admin/reports/page.tsx`

```tsx
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelTitle } from "@/features/dashboard/ui";

// อ่านข้อมูลล่าสุดทุกครั้งที่เปิดหน้า (ลบออกได้ถ้าหน้าไม่ต้องดึงข้อมูลสด)
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  return (
    <div className="flex flex-col gap-[24px]">
      <PageHeader
        title="รายงาน"
        description="สรุปการเบิกสวัสดิการรายเดือน"
        // action={<Button>ส่งออก</Button>}
      />

      <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-6">
        <Panel className="xl:col-span-4" aria-labelledby="report-main">
          <PanelTitle id="report-main">ภาพรวม</PanelTitle>
          {/* เนื้อหา */}
        </Panel>

        <Panel className="xl:col-span-2" aria-labelledby="report-side">
          <PanelTitle id="report-side">สรุปย่อ</PanelTitle>
          {/* เนื้อหา */}
        </Panel>
      </div>
    </div>
  );
}
```

### 4.2 `src/app/admin/reports/loading.tsx`

```tsx
import { Skeleton, SkeletonScreen } from "@/components/Skeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/features/dashboard/ui";

export default function AdminReportsLoading() {
  return (
    <SkeletonScreen className="flex flex-col gap-[24px]">
      <PageHeader title="รายงาน" description="สรุปการเบิกสวัสดิการรายเดือน" />
      <div className="grid grid-cols-1 gap-[24px] xl:grid-cols-6">
        <Panel className="xl:col-span-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-40 w-full" />
        </Panel>
        <Panel className="xl:col-span-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-40 w-full" />
        </Panel>
      </div>
    </SkeletonScreen>
  );
}
```

### 4.3 เพิ่มเมนูใน Sidebar

เพิ่มรายการใน `items` ของ `Sidebar.tsx` — **`id` ต้องตรงกับชื่อโฟลเดอร์ใต้ `/admin/`** เพราะ `AppShell` ใช้ส่วนแรกของ path หลัง `/admin/` เป็น `activeId` เพื่อไฮไลต์เมนู

```tsx
import { BarChart3 } from 'lucide-react';

{ id: 'reports', label: 'รายงาน', icon: BarChart3, href: '/admin/reports' },
```

- ไม่ใส่ `href` = เมนูที่ยังไม่มีหน้า กดแล้วจะขึ้น Toast "กำลังพัฒนา" แทน
- ใส่ `badge` (ตัวเลข) ได้ จะแสดงเป็นจุดเมื่อ Sidebar ถูกย่อ

---

## 5. กติกาที่ทีมควรยึด

1. **ห้าม** ใส่ Sidebar, `<main>`, หรือ padding รอบหน้าเองใน `page.tsx` — Layout จัดการให้แล้ว
2. Root ของทุกหน้าเป็น `<div className="flex flex-col gap-[24px]">` และเริ่มด้วย `<PageHeader>` เสมอ (มี `<h1>` ได้หน้าละหนึ่งอัน)
3. จัดกล่องเนื้อหาด้วย `<Panel>` บน grid `xl:grid-cols-6` แล้วแบ่งด้วย `xl:col-span-*`
4. ใช้ token สี/ขนาดตัวอักษรจากหัวข้อ 2 แทนค่า hex หรือ `text-sm`/`text-lg`
5. ทุกหน้าควรมี `loading.tsx` ที่วาง skeleton ตามโครงเดียวกับหน้าจริง
6. ไอคอนใช้ `lucide-react` ขนาด `size-4` ในเมนู/ปุ่ม และใส่ `aria-hidden="true"`
