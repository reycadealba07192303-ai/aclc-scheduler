import { redirect } from "next/navigation";

// Academic setup was split into Programs & sections and Setup.
export default function AcademicRedirect() {
  redirect("/admin/programs");
}
