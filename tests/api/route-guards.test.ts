import { readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { actAs } from "../support/context";
import { disconnect, jsonRequest, routeContext, seedSchool } from "../support/seed";

/** Routes that must work without signing in (sign-in and account recovery). */
const PUBLIC_ROUTES = new Set([
  "auth/bootstrap", "auth/login", "auth/logout", "auth/session", "auth/setup-status",
  "auth/password-reset/request", "auth/password-reset/complete",
  "auth/password-setup/request", "auth/password-setup/complete",
]);
const METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"] as const;
const API_DIR = path.resolve("src/app/api");

type Handler = (request: Request, context: ReturnType<typeof routeContext>) => Promise<Response>;

function routeFiles(dir = API_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? routeFiles(path.join(dir, entry.name)) : entry.name === "route.ts" ? [path.join(dir, entry.name)] : []);
}

const routes = routeFiles().map((file) => ({
  file,
  name: path.relative(API_DIR, path.dirname(file)).split(path.sep).join("/"),
})).filter((route) => !PUBLIC_ROUTES.has(route.name));

const handlersOf = async (file: string) => {
  const routeModule = (await import(pathToFileURL(file).href)) as Partial<Record<(typeof METHODS)[number], Handler>>;
  return METHODS.filter((method) => typeof routeModule[method] === "function").map((method) => ({ method, handler: routeModule[method]! }));
};

const call = (handler: Handler, method: string, name: string) =>
  handler(jsonRequest(`/api/${name}`, method, {}), routeContext());

let tokens: Awaited<ReturnType<typeof seedSchool>>["tokens"];
beforeAll(async () => { ({ tokens } = await seedSchool()); });
afterAll(disconnect);

describe("every protected API route", () => {
  it("was found", () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it.each(routes.map((route) => [route.name, route.file]))("%s rejects signed-out callers with 401", async (name, file) => {
    for (const { method, handler } of await handlersOf(file)) {
      actAs(null);
      const response = await call(handler, method, name);
      expect(response.status, `${method} /api/${name}`).toBe(401);
    }
  });

  it.each(routes.map((route) => [route.name, route.file]))("%s rejects the wrong role with 403", async (name, file) => {
    // Shared routes (profile, notifications, change-password) serve every signed-in role.
    const allowed = name.startsWith("admin/") ? ["admin"] : name.startsWith("teacher/") ? ["teacher"] : name.startsWith("student/") ? ["student"] : null;
    if (!allowed) return;
    const outsiders = { admin: tokens.admin, teacher: tokens.teacherA, student: tokens.student1 };
    for (const { method, handler } of await handlersOf(file)) {
      for (const [role, token] of Object.entries(outsiders)) {
        if (allowed.includes(role)) continue;
        actAs(token);
        const response = await call(handler, method, name);
        expect(response.status, `${role} ${method} /api/${name}`).toBe(403);
      }
    }
  });
});
