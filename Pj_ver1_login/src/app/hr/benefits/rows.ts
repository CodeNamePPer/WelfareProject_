import "server-only";
import { signBenefitImages } from "@/lib/benefitImages";
import type { getHrBenefits } from "@/lib/hr/benefits";
import type { BenefitRow } from "./BenefitsClient";

type Benefit = NonNullable<Awaited<ReturnType<typeof getHrBenefits>>>[number];

/** แถวของตาราง H03 (ใช้ทั้ง /hr/benefits และ /admin/benefits) */
export async function toBenefitRows(benefits: Benefit[]): Promise<BenefitRow[]> {
  const images = await signBenefitImages(benefits.map((benefit) => benefit.imagePath));
  return benefits.map((benefit) => ({
    code: benefit.code,
    name: benefit.name,
    category: benefit.category ?? "อื่น ๆ",
    imageUrl: benefit.imagePath ? (images.get(benefit.imagePath) ?? null) : null,
    amount: benefit.amount,
    claims: benefit.maxClaimsPerYear !== null ? `${benefit.maxClaimsPerYear} ครั้ง/ปี` : benefit.maxClaims || "ไม่จำกัด",
    active: benefit.status === "active",
  }));
}
