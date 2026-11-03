'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** "danger" for actions that switch something off or can't be undone from this screen. */
  tone?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

// Native <dialog> + showModal(): focus stays inside, Escape closes, focus returns to the opener on close.
export function ConfirmDialog({ open, title, description, confirmLabel, tone = 'primary', onConfirm, onCancel }: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Safe default: Enter on the first focused button cancels rather than confirms.
      dialog.querySelector<HTMLButtonElement>('[data-cancel]')?.focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => event.target === event.currentTarget && onCancel()}
      className="m-auto w-[calc(100%-32px)] max-w-[400px] rounded-[10px] border border-line bg-white p-0 text-ink shadow-lg backdrop:bg-ink/40"
    >
      <div className="flex flex-col gap-[16px] p-[20px]">
        <div className="flex flex-col gap-[6px]">
          <h2 id="confirm-dialog-title" className="text-17 font-semibold">
            {title}
          </h2>
          <div className="text-14 text-muted">{description}</div>
        </div>
        <div className="flex flex-col-reverse gap-[8px] sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel} data-cancel>
            ยกเลิก
          </Button>
          <Button variant={tone} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
