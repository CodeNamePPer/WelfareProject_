import { cx } from '../../lib/cx';

export interface ChipOption<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface FilterChipsProps<T extends string> {
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

// Pill filters ("ทั้งหมด 31", "ใช้งานอยู่ 18", ...) used above Admin tables and lists.
export function FilterChips<T extends string>({ label, options, value, onChange }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-[8px]">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={cx(
              'inline-flex h-[34px] items-center gap-[6px] rounded-full border px-[12px] text-[13px] font-medium transition-colors motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
              active
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-line bg-white text-ink hover:border-primary-500 hover:bg-primary-50',
            )}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className={cx('tabular-nums', active ? 'text-white/80' : 'text-muted')}>{option.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
