import { redirect } from "next/navigation";

// รวมเป็นแท็บในคิวคำขอตามดีไซน์ H01
export default function Page() {
  redirect("/hr/home?tab=revision");
}
