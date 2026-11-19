import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js 16 ถอด `next lint` ออกแล้ว จึงเรียก ESLint ตรง ๆ (npm run lint)
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "data/**"]),
]);

export default eslintConfig;
