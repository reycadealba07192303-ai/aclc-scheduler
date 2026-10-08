import { redirect } from "next/navigation";

export default function AccountsRedirect() {
  redirect("/admin/users?category=admins");
}
