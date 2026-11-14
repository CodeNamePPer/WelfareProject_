import { HR_APPROVED_STATUSES, HR_QUEUE_STATUSES } from "@/lib/claims/mappers";
import type { ClaimDbStatus } from "@/lib/claims/types";

/** สถานะคำขอที่ HR เห็น (ใช้ในรายงาน) */
export const HR_STATUSES: ClaimDbStatus[] = [...HR_QUEUE_STATUSES, ...HR_APPROVED_STATUSES, "needs_revision", "rejected"];
