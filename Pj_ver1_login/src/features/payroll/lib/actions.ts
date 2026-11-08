/** เรียกคำสั่งเปลี่ยนสถานะคำขอ คืนข้อความเมื่อไม่สำเร็จ */
export async function claimAction(
  claimNo: string,
  body: { action: string; note?: string; amountApproved?: number; transferRef?: string },
): Promise<string | null> {
  try {
    const response = await fetch(`/api/claims/${encodeURIComponent(claimNo)}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const data = await response.json();
    return data.error ?? "ดำเนินการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  } catch {
    return "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
  }
}
