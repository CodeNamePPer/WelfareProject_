'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastContextValue {
  /** Shows a short message for actions whose destination page is not built yet. */
  notifyPending: (label: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  const notifyPending = useCallback((label: string) => {
    setMessage(`“${label}” ยังไม่เปิดใช้งานในเวอร์ชันนี้`);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const value = useMemo(() => ({ notifyPending }), [notifyPending]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {message ? (
          <p className="pointer-events-auto rounded-lg bg-ink px-4 py-2.5 text-[13px] text-white shadow-lg">
            {message}
          </p>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
