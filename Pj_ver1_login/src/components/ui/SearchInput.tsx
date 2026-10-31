import { Search, X } from 'lucide-react';
import { cx } from '../../lib/cx';

interface SearchInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchInput({ label, placeholder, value, onChange, className }: SearchInputProps) {
  return (
    <label className={cx('relative block', className)}>
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-white pr-9 pl-9 text-[13px] text-ink placeholder:text-muted hover:border-muted/60 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
          aria-label="ล้างคำค้นหา"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </label>
  );
}
