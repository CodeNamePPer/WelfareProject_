// Class names shared by the Admin data tables (Figma: tinted header bar, 52px rows, 1px dividers).
// Below md (768px) a table is too cramped, so each table also renders a card list and the wrapper hides.
export const table = {
  wrapper: 'hidden overflow-x-auto md:block',
  table: 'w-full min-w-[640px] border-separate border-spacing-0 text-left text-13',
  th: 'border-y border-line bg-surface px-[10px] py-[12px] text-12 font-medium whitespace-nowrap text-muted first:rounded-l-[6px] first:border-l last:rounded-r-[6px] last:border-r',
  td: 'border-b border-line px-[10px] py-[14px] align-middle text-ink',
  row: 'transition-colors motion-reduce:transition-none',
  rowSelected: 'bg-primary-50',
  rowHover: 'hover:bg-surface',

  cards: 'flex flex-col gap-[8px] md:hidden',
  card: 'block w-full rounded-[8px] border border-line p-[12px] text-left text-13 text-ink',
  cardButton:
    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-reduce:transition-none',
  // ! so the state wins over the card's border-line regardless of CSS order.
  cardSelected: '!border-primary-500 bg-primary-50',
  cardHover: 'hover:bg-surface',
  cardEmpty: 'rounded-[8px] border border-dashed border-line px-[16px] py-[32px] text-center text-13 text-muted md:hidden',
};

/** Below xl the detail panel sits under the list, so bring it into view after a row is picked. */
export function revealDetail(id: string) {
  if (!window.matchMedia('(max-width: 1279px)').matches) return;
  const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }));
}
