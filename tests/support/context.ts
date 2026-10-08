/** The fake request that `next/headers` returns in tests (see setup.ts). */
export const requestContext = {
  headers: new Headers(),
  cookies: new Map<string, string>(),
};

/** Makes the next route call come from `token` (or from nobody) and from `ip`. */
export function actAs(token: string | null, ip = "10.0.0.1") {
  requestContext.headers = new Headers({ "x-forwarded-for": ip, ...(token ? { authorization: `Bearer ${token}` } : {}) });
  requestContext.cookies.clear();
  return requestContext.headers;
}
