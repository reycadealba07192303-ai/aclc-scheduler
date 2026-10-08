import { redirect } from "next/navigation";

// Parked: attendance features move to a later system. Remove this redirect to restore.
export default function ParkedLayout({ children }: { children: React.ReactNode }) {
  void children;
  redirect("/admin");
}
