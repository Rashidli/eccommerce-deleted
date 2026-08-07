import "server-only";

// ZARA API klienti — Partzona-dan TAM AYRIDIR (öz base URL-i, öz auth-u).
// Zara "ES Data API" bizim öz serverimizdir (zara.ini.az) və başsız zara.com
// brauzerini idarə edir. Ona görə cavablar bəzən gec gələ bilər (browser session).
//
// Qayda #2: token yalnız serverdə qalır (`server-only`), client bundle-a düşmür.
// Token həm `Authorization: Bearer`, həm `x-api-key` kimi göndərilir — Zara serveri
// hansını yoxlayırsa yoxlasın, örtülüdür. Token yoxdursa auth-suz işləyir (xəbərdarlıqla).

const BASE_URL = process.env.ZARA_API_URL || "https://zara.ini.az/api";
const TOKEN = process.env.ZARA_API_TOKEN || "";

/** Zara başsız brauzeri idarə etdiyi üçün cavablar 1688/Taobao-dan yavaş ola bilər. */
const TIMEOUT_MS = 30_000;

let warnedNoToken = false;

export class ZaraError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ZaraError";
  }
}

function authHeaders(): Record<string, string> {
  if (!TOKEN) {
    if (!warnedNoToken) {
      // Yalnız bir dəfə xəbərdarlıq — server-side enforcement açılana qədər normaldır.
      console.warn("[zara] ZARA_API_TOKEN yoxdur — sorğular auth-suz gedir");
      warnedNoToken = true;
    }
    return {};
  }
  return {
    Authorization: `Bearer ${TOKEN}`,
    "x-api-key": TOKEN,
  };
}

/**
 * Zara API-yə GET sorğusu — həmişə JSON qaytarır.
 * `params` içindəki `undefined`/`null` dəyərlər ötürülür (URL-ə düşmür).
 */
export async function zaraFetch<T = unknown>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
): Promise<T> {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    BASE_URL.endsWith("/") ? BASE_URL : `${BASE_URL}/`,
  );
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json", ...authHeaders() },
      signal: controller.signal,
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      throw new ZaraError("Zara API auth xətası (token?)", res.status);
    }
    if (!res.ok) {
      throw new ZaraError(`Zara API xətası: HTTP ${res.status}`, res.status);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof ZaraError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ZaraError("Zara API vaxt aşımı (browser session yavaş?)");
    }
    throw new ZaraError(
      `Zara API əlçatmaz: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Auth və ya keçici şəbəkə xətası — çağıran boş nəticə ilə davam etsin. */
export function isZaraSoftError(error: unknown): boolean {
  return error instanceof ZaraError;
}
