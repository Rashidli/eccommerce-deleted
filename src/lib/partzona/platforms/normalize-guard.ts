import "server-only";
import type { ProductWriteData } from "./types";

/**
 * NORMALIZE SƏRHƏDİ — bütün platformaların cavabı burada EYNİ şəklə düşür.
 *
 * Məqsəd: frontend heç vaxt sınmasın. Ona görə iki zəmanət veririk:
 *   1) TOTAL DTO — UI-ın oxuduğu hər sahə HƏMİŞƏ mövcuddur (defaultlu).
 *      Komponentlərdə `?.` və `?? ""` yığını olmamalıdır.
 *   2) HEÇ VAXT ATMIR — platforma sahəni silsə/adını dəyişsə, zədəli element
 *      ATLANIR və sayılır; bütün paket sınmır.
 *
 * Platformaya xas nə varsa `attributes`-də, xam cavab isə `raw`-da qalır —
 * bu sərhəddən o tərəfə platforma formalı heç nə keçmir (qayda #6).
 */

/* --------------------------- tip çevirmələri --------------------------- */

/**
 * Qiyməti sentə çevirir. Platformalar qiyməti müxtəlif cür verir:
 *   "22.80" (yuan sətri) · 22.8 (ədəd) · { price: "22.80" } · "12.00-25.00" (aralıq)
 * Aralıqda ƏN AŞAĞI dəyər götürülür (kartda "-dan başlayan" qiymət).
 */
export function toCents(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value * 100) : 0;
  }
  const text = String(value).replace(",", ".");
  const nums = text.match(/\d+(\.\d+)?/g);
  if (!nums?.length) return 0;
  const min = Math.min(...nums.map(Number).filter(Number.isFinite));
  return Number.isFinite(min) ? Math.round(min * 100) : 0;
}

/** Onsuz da sent olan tam ədəd (fen) — sadəcə təhlükəsiz çevirmə. */
export function centsFromInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Şəkil sahəsi sətir də ola bilər, massiv də — həmişə təmiz massiv qaytarır. */
/**
 * İstənilən şəkil formasını təmiz `string[]`-ə çevirir.
 *
 * VACİB: platforma normalizer-ləri `images`-i ARTIQ `JSON.stringify(...)` ilə
 * sətir kimi qaytarır. Əvvəl bu sətir massiv sayılmır, `[sətir]`-ə bükülür və
 * burada bir daha stringify olunurdu → bazada ikiqat kodlaşmış JSON qalırdı
 * (`["[\"url\"]"]`) və qalereya sınıq URL göstərirdi. 1332 sətir belə korlanmışdı.
 *
 * Ona görə burada hər şey açılır: JSON sətri, iç-içə massiv, `{url}` obyekti.
 */
export function toImageList(value: unknown, depth = 0): string[] {
  if (!value || depth > 3) return [];

  // JSON massiv sətri → əsl massivə aç (ikiqat kodlaşmanın qarşısını alır).
  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) return toImageList(parsed, depth + 1);
      } catch {
        /* JSON deyil — adi URL kimi davam edir */
      }
    }
    return [text];
  }

  // `{ url: "..." }` (Zara `colors[].images[]` belə gəlir)
  if (!Array.isArray(value)) {
    const u = (value as { url?: unknown }).url;
    return typeof u === "string" && u.trim() ? [u.trim()] : [];
  }

  // Massiv — iç-içə massivlər də düzləşdirilir.
  const out: string[] = [];
  for (const item of value) {
    for (const url of toImageList(item, depth + 1)) {
      if (!out.includes(url)) out.push(url);
    }
  }
  return out;
}

export function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

export function toInt(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function toFloat(value: unknown, fallback = 0): number {
  const n = parseFloat(String(value ?? ""));
  return Number.isFinite(n) ? n : fallback;
}

/* ----------------------------- total DTO ----------------------------- */

/** Normalizer-in qaytardığı sərbəst forma — `finalizeProduct` tamamlayır. */
export type PartialProduct = Partial<ProductWriteData> & {
  externalId?: unknown;
  source?: unknown;
};

/**
 * DTO-nu TAMAMLAYIR: UI-ın oxuduğu hər sahəyə dəyər verir.
 * `externalId` və ya `source` yoxdursa `null` qaytarır — belə sətir bazaya
 * yazıla bilməz (dedup açarı pozulardı) və atlanmalıdır.
 */
export function finalizeProduct(
  p: PartialProduct,
  /**
   * Platformanın DB-dəki valyutası (`Platform.currency`).
   * Normalizer cavabda açıq valyuta tapıbsa o üstündür; tapmayıbsa bura düşür.
   * Sonuncu ehtiyat "CNY"-dir — köhnə davranış, heç nə səssizcə dəyişməsin.
   */
  fallbackCurrency?: string,
): ProductWriteData | null {
  const externalId = toText(p.externalId);
  const source = toText(p.source);
  if (!externalId || !source) return null;

  const images = toImageList(p.images ?? []);
  const image = toText(p.image) || images[0] || "";
  const name = toText(p.name) || toText(p.nameEn) || externalId;

  return {
    externalId,
    source,
    name,
    nameEn: (p.nameEn as string | null) ?? null,
    nameAz: (p.nameAz as string | null) ?? null,
    nameRu: (p.nameRu as string | null) ?? null,
    brand: toText(p.brand) || source,
    priceCents: Math.max(0, toInt(p.priceCents, 0)),
    oldPriceCents:
      p.oldPriceCents != null && toInt(p.oldPriceCents) > 0
        ? toInt(p.oldPriceCents)
        : null,
    currency: toText(p.currency) || fallbackCurrency || "CNY",
    image,
    // `images` DB-də JSON sətri kimi saxlanır — UI həmişə massiv parse edir.
    images: JSON.stringify(images.length ? images : image ? [image] : []),
    rating: Math.max(0, toFloat(p.rating, 0)),
    reviewCount: Math.max(0, toInt(p.reviewCount, 0)),
    salesCount: p.salesCount == null ? null : toInt(p.salesCount, 0),
    minOrderQty: Math.max(1, toInt(p.minOrderQty, 1)),
    stock: Math.max(0, toInt(p.stock, 0)),
    isActive: p.isActive === false ? false : true,
    sourceUrl: (p.sourceUrl as string | null) ?? null,
    sourceCategoryId: (p.sourceCategoryId as string | null) ?? null,
    sourcePoolType: (p.sourcePoolType as string | null) ?? null,
    // Platformaya xas hər şey burada qapalı qalır.
    attributes: (p.attributes as object) ?? {},
    raw: (p.raw as object) ?? {},
    ...(p.description != null ? { description: toText(p.description) } : {}),
    ...(p.descEn != null ? { descEn: toText(p.descEn) } : {}),
    ...(p.sizes != null ? { sizes: p.sizes } : {}),
    ...(p.colors != null ? { colors: p.colors } : {}),
  };
}

/* --------------------------- toplu emal --------------------------- */

export type MapResult = { products: ProductWriteData[]; skipped: number };

/**
 * Siyahını normalize edir: ZƏDƏLİ element bütün paketi sındırmır, atlanır.
 * Platforma sahəni silsə/adını dəyişsə, qalan məhsullar yenə göstərilir.
 */
export function mapSafe<T>(
  items: T[],
  normalize: (item: T) => PartialProduct,
  /** Platformanın DB valyutası — normalizer verməyibsə istifadə olunur. */
  fallbackCurrency?: string,
): MapResult {
  const products: ProductWriteData[] = [];
  let skipped = 0;

  for (const item of items) {
    try {
      const finalized = finalizeProduct(normalize(item), fallbackCurrency);
      if (finalized) products.push(finalized);
      else skipped++;
    } catch {
      // Gözlənilməz forma — bu elementi buraxırıq, axın davam edir.
      skipped++;
    }
  }

  return { products, skipped };
}

/** Detal patch-i üçün eyni qoruma: xəta olsa `null`, mövcud DB sətri qalır. */
export function safePatch<T>(
  raw: T | null,
  normalize: (item: T) => Record<string, unknown>,
): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return normalize(raw);
  } catch {
    return null;
  }
}
