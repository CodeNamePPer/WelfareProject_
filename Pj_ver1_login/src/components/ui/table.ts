// Class names shared by the Admin data tables (Figma: tinted header bar, 52px rows, 1px dividers).
// Below md (768px) a table is too cramped, so each table also renders a ruled list (no boxed cards) and the wrapper hides.
export const table = {
  wrapper: 'hidden overflow-x-auto md:block',
  table: 'w-full min-w-[640px] border-separate border-spacing-0 text-left text-13',
  th: 'border-y border-line bg-surface px-[10px] py-[12px] text-12 font-medium whitespace-nowrap text-muted first:rounded-l-[6px] first:border-l last:rounded-r-[6px] last:border-r',
  td: 'border-b border-line px-[10px] py-[14px] align-middle text-ink',
  row: 'transition-colors motion-reduce:transition-none',
  rowHover: 'hover:bg-surface',

  cards: 'flex flex-col border-t border-line md:hidden',
  card: 'block w-full border-b border-line px-[4px] py-[12px] text-left text-13 text-ink',
  cardButton:
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
  cardHover: 'hover:bg-surface',
  cardEmpty: 'py-[24px] text-center text-13 text-muted md:hidden',
};
