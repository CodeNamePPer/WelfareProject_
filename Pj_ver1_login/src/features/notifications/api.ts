export type AlertUpdate = { action: 'read' | 'unread' | 'resolve'; id: string } | { action: 'read_all' };

/** บันทึกสถานะแจ้งเตือนผ่าน /api/admin/notifications – ล้มเหลวจะ throw พร้อมข้อความจากเซิร์ฟเวอร์ */
export async function updateAlert(update: AlertUpdate): Promise<void> {
  const res = await fetch('/api/admin/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? 'บันทึกสถานะการแจ้งเตือนไม่สำเร็จ');
  }
}
