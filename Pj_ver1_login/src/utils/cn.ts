export function cn(...inputs: any[]) {
  return inputs
    .flatMap((x) => (typeof x === "function" ? "" : x))
    .filter(Boolean)
    .join(" ");
}
