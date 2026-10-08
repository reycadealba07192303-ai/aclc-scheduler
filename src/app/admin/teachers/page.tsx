import { redirect } from "next/navigation";

export default function TeachersRedirect() {
  redirect("/admin/users?category=professors");
}
