import { vi } from "vitest";

// Tests only ever use a local, throwaway database whose name ends in "_test".
const uri = process.env.TEST_MONGODB_URI ?? "mongodb://127.0.0.1:27017/aclc_scheduler_test";
const parsed = new URL(uri);
if (!["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.pathname.endsWith("_test")) {
  throw new Error(`Refusing to run tests against ${parsed.hostname}${parsed.pathname}: use a local database ending in _test.`);
}
process.env.MONGODB_URI = uri;
process.env.AUTH_SECRET = "dGVzdC1zZWNyZXQtdGhhdC1pcy1hdC1sZWFzdC0zMi1ieXRlcy1sb25n";

// Route handlers read the request through next/headers; serve the fake request instead.
vi.mock("next/headers", async () => {
  const { requestContext } = await import("./context");
  return {
    headers: async () => requestContext.headers,
    cookies: async () => ({
      get: (name: string) => (requestContext.cookies.has(name) ? { name, value: requestContext.cookies.get(name)! } : undefined),
      set: (name: string, value: string) => { requestContext.cookies.set(name, value); },
      delete: (name: string) => { requestContext.cookies.delete(name); },
    }),
  };
});
