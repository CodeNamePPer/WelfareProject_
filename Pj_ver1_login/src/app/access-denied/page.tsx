import Link from "next/link";

const MESSAGES: Record<string, { title: string; body: string }> = {
  network: {
    title: "เข้าใช้งานได้เฉพาะเครือข่ายของบริษัท",
    body: "กรุณาเชื่อมต่อ Wi-Fi หรือ LAN ของที่ทำงาน แล้วลองใหม่อีกครั้ง",
  },
  role: {
    title: "คุณไม่มีสิทธิ์เข้าหน้านี้",
    body: "หากต้องการสิทธิ์เพิ่ม กรุณาติดต่อ IT Support หรือ HR",
  },
};

export default async function AccessDenied({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  const msg = MESSAGES[reason ?? ""] ?? MESSAGES.role;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">{msg.title}</h1>
        <p className="mt-3 text-ink-soft">{msg.body}</p>
        {reason !== "network" && (
          <Link
            href="/"
            className="mt-8 inline-block rounded-md bg-ink px-5 py-2.5 font-medium text-white hover:bg-ink-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            กลับหน้าหลัก
          </Link>
        )}
      </div>
    </main>
  );
}
