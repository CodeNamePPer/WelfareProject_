/** เพดานรวมต่อปีของพนักงาน (ทุกสวัสดิการรวมกัน) cap/remaining = null คือไม่จำกัด */
export type TotalCap = { cap: number | null; used: number; remaining: number | null };

/**
 * ยอดที่ยังเบิกได้รวมทุกสวัสดิการ = ผลรวมคงเหลือแต่ละสวัสดิการ แต่ไม่เกินคงเหลือของเพดานรวม
 * (คงเหลือแต่ละสวัสดิการถูกบีบด้วยเพดานรวมอยู่แล้ว บวกตรง ๆ จึงเกินเพดานได้)
 */
export function availableTotal(benefits: { remaining: number }[], cap: TotalCap | null | undefined): number {
  const sum = benefits.reduce((total, item) => total + Math.max(item.remaining, 0), 0);
  return cap?.remaining === null || cap?.remaining === undefined ? sum : Math.min(sum, cap.remaining);
}
