import { redirect } from "next/navigation";

// Student portal (QR attendance) is parked for a later system. The pages stay in
// this folder; remove this redirect to bring them back.
export default function StudentLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/");
}
