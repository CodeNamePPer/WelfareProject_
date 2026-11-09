'use client';

import { usePathname, useSearchParams } from 'next/navigation';

/**
 * A list and its detail page share one route: ?param=<id> shows the detail page.
 * Opening uses pushState so the list keeps its filters, needs no server round trip,
 * and the browser back button returns to it.
 */
export function useDetailParam(param: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = (id: string, extraParams: Record<string, string> = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set(param, id);
    Object.entries(extraParams).forEach(([key, value]) => next.set(key, value));
    window.history.pushState(null, '', `${pathname}?${next}`);
    window.scrollTo(0, 0);
  };

  /** Back to the list without a history entry, for a detail page that no longer exists (a cancelled draft). */
  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const query = next.toString();
    window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname);
  };

  return { id: searchParams.get(param), open, close };
}
