import { notFound } from 'next/navigation';

// URL ใต้ /admin ที่ไม่ตรงกับหน้าใดเลย ส่งเข้า admin/not-found เพื่อให้แสดงภายใน layout ของ Admin
export default function AdminMissingPage() {
  notFound();
}
