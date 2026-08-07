import "server-only";

/**
 * MƏZƏNNƏ MƏNBƏYİ — Azərbaycan Mərkəzi Bankı (CBAR).
 *
 * Niyə CBAR: rəsmi, gündəlik yenilənən, açar tələb etməyən mənbədir və
 * manatın kursu onsuz da buradan gəlir. Pulsuz üçüncü tərəf API-lərindən
 * fərqli olaraq kvota/söndürülmə riski yoxdur.
 *
 * CBAR bütün valyutaları MANATA qarşı verir (1 USD = 1.70 AZN kimi). Bizə isə
 * "X → göstəriş valyutası" lazımdır, ona görə manat körpü kimi işlədilir:
 *
 *     X → Q  =  (X → AZN) / (Q → AZN)
 *
 * Bu, `convert.ts`-dəki "çarpaz məzənnə etmirik" qaydasına zidd deyil: orada
 * söhbət İKİ AYRI keşlənmiş məzənnəni bir-birinə vurmaqdan gedir. Burada hər
 * iki dəyər EYNİ bülletendəndir — CBAR-ın öz gün kursu, xəta toplanmır.
 */

const CBAR_URL = "https://www.cbar.az/currencies";

export type CbarRates = {
  /** Bülletenin tarixi (gg.aa.iiii) — audit üçün. */
  date: string;
  /** ISO kod → 1 vahidin MANAT dəyəri. */
  toAzn: Record<string, number>;
};

/** `dd.mm.yyyy` — CBAR yol formatı. */
function cbarDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Bir günün bülletenini oxuyur.
 *
 * CBAR `Nominal` sahəsi ilə "100 yapon yeni = X AZN" kimi verə bilər, ona görə
 * dəyər nominala bölünür — nəticə HƏMİŞƏ 1 vahidin manat qiymətidir.
 */
function parse(xml: string): CbarRates | null {
  const date = xml.match(/<ValCurs[^>]*Date="([^"]+)"/)?.[1];
  if (!date) return null;

  const toAzn: Record<string, number> = { AZN: 1 };
  const re =
    /<Valute\s+Code="([A-Z]{3})">[\s\S]*?<Nominal>([^<]*)<\/Nominal>[\s\S]*?<Value>([^<]*)<\/Value>/g;

  for (const m of xml.matchAll(re)) {
    const [, code, nominalRaw, valueRaw] = m;
    const nominal = Number(String(nominalRaw).trim().replace(",", ".")) || 1;
    const value = Number(String(valueRaw).trim().replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) continue;
    toAzn[code] = value / nominal;
  }

  return Object.keys(toAzn).length > 1 ? { date, toAzn } : null;
}

/**
 * Bugünkü (lazım gələrsə əvvəlki günlərin) məzənnəsini gətirir.
 *
 * Həftəsonu/bayramda bülleten dərc olunmur — ona görə geriyə doğru
 * `maxLookbackDays` gün yoxlanılır. Heç biri alınmasa `null`: KÖHNƏ məzənnə
 * bazada olduğu kimi qalır, uydurma dəyər yazılmır.
 */
export async function fetchCbarRates(
  maxLookbackDays = 7,
): Promise<CbarRates | null> {
  for (let i = 0; i <= maxLookbackDays; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    try {
      const res = await fetch(`${CBAR_URL}/${cbarDate(d)}.xml`, {
        // Bu, xarici sorğudur — server tərəfdə, keşsiz.
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const parsed = parse(await res.text());
      if (parsed) return parsed;
    } catch {
      // Şəbəkə xətası — növbəti günə keç.
    }
  }
  return null;
}

/**
 * `base → quote` məzənnəsi (manat körpüsü ilə).
 * Hər hansı biri bülletendə yoxdursa `null` — təxmin edilmir.
 */
export function crossRate(
  rates: CbarRates,
  base: string,
  quote: string,
): number | null {
  const b = rates.toAzn[base.toUpperCase()];
  const q = rates.toAzn[quote.toUpperCase()];
  if (!b || !q) return null;
  return b / q;
}
