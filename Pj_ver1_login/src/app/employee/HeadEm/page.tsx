import { redirect } from "next/navigation";

// การยื่นแทนย้ายไปอยู่ในฟอร์มยื่นคำขอตามดีไซน์ R04 ลิงก์เดิมจึงพาไปโหมดยื่นแทน
export default function HeadEmPage() {
  redirect("/employee/withdraw?for=proxy");
}
