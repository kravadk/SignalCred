export const PUBLIC_API_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  "X-SignalCred-No-Fake-Data": "true",
};

export function publicJsonHeaders(extra?: Record<string, string>) {
  return {
    ...PUBLIC_API_HEADERS,
    ...(extra ?? {}),
  };
}
