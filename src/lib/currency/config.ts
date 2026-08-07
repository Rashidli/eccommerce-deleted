import "server-only";
import { prisma } from "@/lib/prisma";
import { EMPTY_CURRENCY_CONFIG, type CurrencyConfig } from "./types";

/**
 * Valyuta konfiqurasiyasını BAZADAN oxuyur (qayda #4 — kodda sabit yoxdur).
 *
 * Nəticə qısa müddət keşlənir: səbətin hər sətri üçün ayrıca sorğu atmaq
 * mənasızdır, məzənnə isə saniyələr ərzində dəyişmir.
 */

const CACHE_TTL_MS = 60_000;

let cache: { config: CurrencyConfig; at: number } | null = null;

export async function getCurrencyConfig(): Promise<CurrencyConfig> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.config;

  try {
    const [settings, rateRows] = await Promise.all([
      prisma.currencySettings.findUnique({ where: { id: "default" } }),
      prisma.exchangeRate.findMany(),
    ]);

    const rates: CurrencyConfig["rates"] = {};
    for (const r of rateRows) {
      (rates[r.base] ??= {})[r.quote] = r.rate;
    }

    const config: CurrencyConfig = {
      displayCurrency: settings?.displayCurrency ?? null,
      markupBps: settings?.markupBps ?? 0,
      rates,
    };
    cache = { config, at: Date.now() };
    return config;
  } catch {
    // Baza əlçatmazdırsa çevirmə SÖNÜR — uydurma məzənnə ilə davam etmirik.
    return EMPTY_CURRENCY_CONFIG;
  }
}

/** Admin dəyişiklikdən sonra keşi sıfırlayır. */
export function invalidateCurrencyCache(): void {
  cache = null;
}

/**
 * Platformanın satış valyutası — bazadakı `Platform.currency`.
 * Normalizer-lərin sabit "CNY"/"EUR" dəyərləri əvəzinə bura baxılır.
 * Platforma tapılmasa `null` qaytarılır; çağıran öz fallback-ini seçir.
 */
const platformCache = new Map<string, { currency: string; at: number }>();

export async function getPlatformCurrency(
  platformKey: string,
): Promise<string | null> {
  const hit = platformCache.get(platformKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.currency;

  try {
    const row = await prisma.platform.findUnique({
      where: { key: platformKey },
      select: { currency: true },
    });
    if (!row?.currency) return null;
    platformCache.set(platformKey, { currency: row.currency, at: Date.now() });
    return row.currency;
  } catch {
    return null;
  }
}
