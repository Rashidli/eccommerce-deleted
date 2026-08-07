import {
  EMPTY_CURRENCY_CONFIG,
  type ConvertedAmount,
  type CurrencyConfig,
} from "./types";

/**
 * ÇEVİRMƏ MƏNTİQİ — saf funksiyalar, DB-dən asılı deyil.
 *
 * Ona görə ayrıdır ki, həm serverdə (səhifə render-i), həm də client-də
 * (səbət) eyni məntiq işlədilsin və test oluna bilsin.
 *
 * ƏSAS QAYDA: məzənnə yoxdursa TƏXMİN ETMİRİK. Yanlış rəqəm göstərmək
 * çevirməməkdən qat-qat pisdir — müştəri gördüyü qiymətə görə qərar verir.
 */

/** Marjanı tətbiq edir: 250 bps = %2.5 artım. */
function withMarkup(rate: number, markupBps: number): number {
  return rate * (1 + markupBps / 10_000);
}

/**
 * `base` → `quote` məzənnəsini tapır.
 * Birbaşa sətir yoxdursa TƏRS sətri yoxlayır (AZN→CNY varsa, CNY→AZN = 1/rate).
 * Heç biri yoxdursa `null` — çevirmə edilmir.
 */
export function findRate(
  config: CurrencyConfig,
  base: string,
  quote: string,
): number | null {
  if (base === quote) return 1;

  const direct = config.rates[base]?.[quote];
  if (typeof direct === "number" && direct > 0) return direct;

  const inverse = config.rates[quote]?.[base];
  if (typeof inverse === "number" && inverse > 0) return 1 / inverse;

  // Çarpaz məzənnə (CNY→EUR→AZN) QƏSDƏN edilmir: iki məzənnənin xətası
  // toplanır və nəticə etibarsız olur. Admin lazım olan cütü birbaşa yazsın.
  return null;
}

/**
 * Məbləği hədəf valyutaya çevirir.
 * Məzənnə tapılmasa orijinal məbləği `isConverted: false` ilə qaytarır.
 */
export function convertCents(
  amountCents: number,
  from: string,
  to: string | null | undefined,
  config: CurrencyConfig = EMPTY_CURRENCY_CONFIG,
): ConvertedAmount {
  const unconverted: ConvertedAmount = {
    cents: amountCents,
    currency: from,
    isConverted: false,
    sourceCents: amountCents,
    sourceCurrency: from,
  };

  if (!to || to === from) return unconverted;

  const raw = findRate(config, from, to);
  if (raw == null) return unconverted;

  const rate = withMarkup(raw, config.markupBps);
  return {
    cents: Math.round(amountCents * rate),
    currency: to,
    isConverted: true,
    rate,
    sourceCents: amountCents,
    sourceCurrency: from,
  };
}

/**
 * Valyuta üzrə yekunları TƏK valyutaya yığır (məs. səbətin ümumi məbləği).
 *
 * YALNIZ hər sətir çevrilə bildikdə yekun qaytarır. Bir dənəsi belə
 * çevrilməzsə `null` — yarımçıq cəm istifadəçiyə yalan məbləğ göstərərdi.
 */
export function sumConverted(
  rows: { cents: number; currency: string }[],
  to: string | null | undefined,
  config: CurrencyConfig = EMPTY_CURRENCY_CONFIG,
): { cents: number; currency: string } | null {
  if (!to || rows.length === 0) return null;

  let total = 0;
  for (const row of rows) {
    const c = convertCents(row.cents, row.currency, to, config);
    if (!c.isConverted && row.currency !== to) return null;
    total += c.cents;
  }
  return { cents: total, currency: to };
}
