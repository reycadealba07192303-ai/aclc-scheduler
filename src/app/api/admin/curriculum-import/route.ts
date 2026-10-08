import { parseCurriculumPdf } from "@/backend/services/curriculum-pdf";
import { requireRole } from "@/backend/auth/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  try {
    const formData = await request.formData();
    const files = formData.getAll("files").filter((value): value is File => value instanceof File);
    if (!files.length || files.length > 6) {
      return Response.json({ error: "Choose between 1 and 6 curriculum PDF files." }, { status: 400 });
    }

    const results = [];
    for (const file of files) {
      if (!file.name.toLowerCase().endsWith(".pdf") || file.size > MAX_FILE_SIZE) {
        return Response.json({ error: `${file.name} must be a PDF smaller than 10 MB.` }, { status: 400 });
      }
      results.push(await parseCurriculumPdf(new Uint8Array(await file.arrayBuffer())));
    }

    const programName = results[0].programName;
    if (results.some((result) => result.programName.toLowerCase() !== programName.toLowerCase())) {
      return Response.json({ error: "The selected PDFs appear to belong to different programs." }, { status: 400 });
    }

    const curriculum = results.flatMap((result) => result.curriculum);
    const subjects = new Map<string, (typeof results)[number]["subjects"][number]>();
    for (const result of results) for (const subject of result.subjects) subjects.set(subject.code, subject);

    return Response.json({
      programCode: results[0].programCode,
      programName,
      subjects: [...subjects.values()],
      curriculum,
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Could not read the curriculum PDF.",
    }, { status: 400 });
  }
}
