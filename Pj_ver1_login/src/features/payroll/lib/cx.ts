/** รวม class หลายตัว ข้ามค่าที่เป็น false / null / undefined  เช่น cx("a", active && "b") */
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
