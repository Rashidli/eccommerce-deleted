import "server-only";

// Partzona (iniHub Partner API v1) alçaq səviyyəli HTTP client — YALNIZ server (qayda #2).
// Token client bundle-a düşmür: `server-only` + env-dən oxunur, heç vaxt export edilmir.
const BASE = process.env.PARTZONA_API_URL ?? "https://api.partzona.com/api/v1";

export class PartzonaError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "PartzonaError";
  }
}

/** Endpoint icazəsi verilməyibsə Partzona 403 qaytarır — bunu ayırd etmək üçün. */
export function isPermissionError(e: unknown): boolean {
  return e instanceof PartzonaError && e.status === 403;
}

type Primitive = string | number | boolean | undefined | null;

type FetchOpts = {
  params?: Record<string, Primitive>;
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
};

function token(): string {
  const t = process.env.PARTZONA_TOKEN;
  if (!t) throw new PartzonaError(0, "PARTZONA_TOKEN təyin olunmayıb");
  return t;
}

/**
 * Partzona-ya sorğu. Real-time: keşləmə yoxdur (hər axtarış canlı, nəticə sonra DB-yə upsert olunur).
 * 429 (rate limit) üçün bir dəfə qısa backoff ilə təkrar cəhd edir.
 */
export async function partzonaFetch<T = unknown>(
  path: string,
  opts: FetchOpts = {},
  _retried = false,
): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(opts.params ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
    cache: "no-store",
  });

  // Rate limit — bir dəfə gözləyib təkrar cəhd
  if (res.status === 429 && !_retried) {
    const retryAfter = Number(res.headers.get("retry-after")) || 2;
    await new Promise((r) => setTimeout(r, Math.min(retryAfter, 10) * 1000));
    return partzonaFetch<T>(path, opts, true);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "message" in json
        ? String((json as Record<string, unknown>).message)
        : `Partzona sorğusu uğursuz oldu (${res.status})`;
    throw new PartzonaError(res.status, msg, json);
  }

  return json as T;
}
