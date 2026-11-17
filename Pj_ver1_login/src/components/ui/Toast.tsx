'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ToastContextValue {
  /** Shows a short message for actions whose destination page is not built yet. */
  notifyPending: (label: string) => void;
  /** Shows a short message, e.g. when saving failed. */
  notify: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  // id เปลี่ยนทุกข้อความใหม่ → เล่นแอนิเมชันเข้าใหม่ · visible=false → จางหายก่อนแล้วจึงถอดออก
  const [toast, setToast] = useState<{ id: number; text: string; visible: boolean } | null>(null);

  const notify = useCallback((text: string) => setToast((current) => ({ id: (current?.id ?? 0) + 1, text, visible: true })), []);

  const notifyPending = useCallback((label: string) => notify(`“${label}” ยังไม่เปิดใช้งานในเวอร์ชันนี้`), [notify]);

  useEffect(() => {
    if (!toast) return;
    if (toast.visible) {
      const timer = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? { ...current, visible: false } : current)), 3000);
      return () => window.clearTimeout(timer);
    }
    const remove = window.setTimeout(() => setToast((current) => (current?.id === toast.id ? null : current)), 200);
    return () => window.clearTimeout(remove);
  }, [toast]);

  const value = useMemo(() => ({ notifyPending, notify }), [notifyPending, notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
      >
        {toast ? (
          <p
            key={toast.id}
            className={
              'pointer-events-auto animate-toast-in rounded-lg bg-ink px-4 py-2.5 text-13 text-white shadow-lg transition-[opacity,transform] duration-base ease-out ' +
              (toast.visible ? 'opacity-100' : 'translate-y-2 opacity-0')
            }
          >
            {toast.text}
          </p>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
