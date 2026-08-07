import "server-only";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import { pickLang } from "@/lib/data/pick-lang";
import type { Lang } from "@/lib/i18n";
import { getVariants, type ProductVariantsDTO } from "@/lib/products";
import { getCurrencyConfig } from "@/lib/currency/config";
import { convertCents } from "@/lib/currency";
import { EMPTY_CURRENCY_CONFIG, type CurrencyConfig } from "@/lib/currency/types";
import {
  cdnImage,
  CARD_SOURCE_WIDTH,
  GALLERY_SOURCE_WIDTH,
} from "@/lib/cdn-image";

/* ------------------------------ DTO tipləri ------------------------------ */
// Storefront komponentlərinin gözlədiyi şəkil (köhnə mock `Product` ilə uyğun).

export type ProductDTO = {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  rating: number;
  reviewCount?: number;
  brand: string;
  img: string;
  images?: string[];
  description?: string;
  sizes?: string[];
  colors?: { name: string; value: string }[];
  category?: string;
  /** Kateqoriya slug-ı — filtr dil-müstəqil olsun deyə (ad yox, slug müqayisə olunur). */
  categorySlug?: string;
  inStock?: boolean;
  /** Platforma açarı (Platform.key): 1688 / taobao / ... — axtarış filtri üçün. */
  source?: string;
  /** Platforma nişanının rəngləri — DB-dəki `Platform.badgeBg/badgeFg`-dən. */
  sourceBadgeBg?: string;
  sourceBadgeFg?: string;
  /** Nişanda göstərilən ad (Platform.nameEn), yoxdursa açarın özü. */
  sourceLabel?: string;
  /** Xam qiymət (sent) — qiymət filtri və sıralama üçün (formatlanmış `price` deyil). */
  priceCents: number;
  /** Endirimdən əvvəlki xam qiymət (sent) — endirim faizi bundan hesablanır. */
  oldPriceCents?: number;
  /** Məhsulun ÖZ valyutası (1688/taobao → CNY, zara → EUR). Simvol buna görə seçilir. */
  currency: string;
  /** ISO tarix — "ən yeni" sıralaması üçün. */
  createdAt: string;
  /** Variant/SKU matrisi — YALNIZ `getProductById` doldurur (detal səhifəsi). */
  variants?: ProductVariantsDTO;
  /**
   * Kartda göstərilən RƏNG önizləmələri.
   *
   * Platforma siyahıda hər rəngi ayrıca sətir kimi verir; import zamanı onlar
   * bir məhsulda birləşdirilir (`mergeColorRows`). Beləcə kartda "bu məhsulun
   * 6 rəngi var" görünür — əvvəl yalnız birinci rəng qalırdı.
   */
  colorPreview?: { name: string; hex?: string; image?: string }[];
};

/**
 * Məhsul kartı üçün MİNİMAL sahələr — həm `ProductDTO`, həm `WishlistItem`
 * bu şəklə uyğun gəlir.
 *
 * Qiymət XAM rəqəm + valyuta kimi verilir; formatlama render-də olur.
 * Əvvəl formatlanmış mətn ötürülürdü və endirim faizi onu regex ilə geri
 * parse edirdi — valyuta itirdi və "$54.90" ilə "¥54.90" fərqlənmirdi.
 */
export type ProductCardDTO = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  /** Platforma nişanı — məhsulun hansı platformadan gəldiyi kartda görünür. */
  source?: string;
  sourceBadgeBg?: string;
  sourceBadgeFg?: string;
  sourceLabel?: string;
  /** Endirimdən əvvəlki qiymət (sent) — varsa endirim faizi hesablanır. */
  oldPriceCents?: number;
  rating: number;
  brand: string;
  img: string;
};

export type HomeCategoryDTO = {
  key: string;
  name: string;
  /** İngiliscə ad — ikon seçimi üçün (açar sözlər ingiliscədir). */
  nameEn?: string;
  img: string;
  href: string;
};
export type PlatformDTO = { key: string; name: string; tagline: string };
export type SlideDTO = { id: string; title: string; subtitle: string | null; image: string; href: string };
export type CampaignDTO = {
  key: string;
  eyebrow: string;
  title: string;
  cta: string;
  href: string;
  img: string;
  tint: string;
};

/* ------------------------------ köməkçilər ------------------------------ */

function parseJsonArray<T>(raw: string | null): T[] | undefined {
  if (!raw) return undefined;
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as T[]) : undefined;
  } catch {
    return undefined;
  }
}

type ProductRow = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

/* -------------------------- vahid göstəriş valyutası --------------------------
 * Məhsul BAZADA öz platformasının valyutasında saxlanılır (1688/Taobao → CNY,
 * Zara → EUR) — sifariş və ödəniş üçün həqiqət odur. Amma müştəri bir mağazada
 * üç valyuta görməməlidir: `CurrencySettings.displayCurrency` (USD) təyin
 * olunubsa, siyahılardakı bütün qiymətlər ona ÇEVRİLİR.
 *
 * Çevirmə DTO qatındadır ki, hər komponent ayrı-ayrı yadda saxlamasın —
 * `price`, `priceCents` və `currency` artıq göstəriş valyutasındadır.
 *
 * Məzənnə YOXDURSA çevirmə edilmir: məhsul öz valyutasında görünür. Uydurma
 * məzənnə ilə rəqəm göstərmək müştərini aldatmaq olardı.
 * ---------------------------------------------------------------------------- */
const CURRENCY_TTL_MS = 60_000;
let currencyCache: { at: number; config: CurrencyConfig } | null = null;

/** Keşi doldurur — siyahı funksiyaları `toProductDTO`-dan ƏVVƏL çağırır. */
async function warmCurrency(): Promise<void> {
  if (currencyCache && Date.now() - currencyCache.at < CURRENCY_TTL_MS) return;
  currencyCache = { at: Date.now(), config: await getCurrencyConfig() };
}

function currencyConfig(): CurrencyConfig {
  return currencyCache?.config ?? EMPTY_CURRENCY_CONFIG;
}

/** Sentləri göstəriş valyutasına çevirir (məzənnə yoxdursa olduğu kimi qalır). */
function display(cents: number, from: string): { cents: number; currency: string } {
  const cfg = currencyConfig();
  const c = convertCents(cents, from, cfg.displayCurrency, cfg);
  return { cents: c.cents, currency: c.currency };
}

function toProductDTO(
  p: ProductRow,
  lang: Lang,
  categoryName?: string,
  categorySlug?: string,
): ProductDTO {
  const price = display(p.priceCents, p.currency);
  const oldPrice =
    p.oldPriceCents != null ? display(p.oldPriceCents, p.currency) : null;

  return {
    id: p.id,
    name: pickLang(p, "name", lang) || p.name,
    price: formatMoney(price.cents, price.currency),
    currency: price.currency,
    priceCents: price.cents,
    createdAt: p.createdAt.toISOString(),
    categorySlug,
    originalPrice: oldPrice
      ? formatMoney(oldPrice.cents, oldPrice.currency)
      : undefined,
    oldPriceCents: oldPrice?.cents ?? undefined,
    rating: p.rating,
    reviewCount: p.reviewCount || undefined,
    brand: p.brand,
    // Şəkillər CDN-in kiçildilmiş variantı ilə gəlir — `next/image` nəhəng
    // orijinalı Çindən endirməsin (bax: `@/lib/cdn-image`).
    img: cdnImage(p.image, CARD_SOURCE_WIDTH),
    images: parseJsonArray<string>(p.images)?.map((u) =>
      cdnImage(u, GALLERY_SOURCE_WIDTH),
    ),
    description: pickLang(p, "desc", lang) || p.description || undefined,
    sizes: parseJsonArray<string>(p.sizes),
    colors: parseJsonArray<{ name: string; value: string }>(p.colors),
    category: categoryName,
    inStock: p.stock > 0,
    source: p.source ?? undefined,
    sourceBadgeBg: platformStyle(p.source)?.bg || undefined,
    sourceBadgeFg: platformStyle(p.source)?.fg || undefined,
    sourceLabel: platformStyle(p.source)?.label || undefined,
    colorPreview: colorPreviewOf(p.attributes),
  };
}

/**
 * `attributes.colorThumbs` → kart üçün rəng siyahısı.
 *
 * Platformadan asılı deyil: sahə yoxdursa və ya formatı gözlənilməzdirsə boş
 * qayıdır (kart sadəcə rəng nöqtəsi göstərmir) — UYDURMA rəng çəkilmir.
 */
function colorPreviewOf(
  attributes: unknown,
): { name: string; hex?: string; image?: string }[] | undefined {
  const thumbs = (attributes as { colorThumbs?: unknown } | null)?.colorThumbs;
  if (!Array.isArray(thumbs) || thumbs.length === 0) return undefined;

  const out = thumbs.flatMap((c) => {
    if (!c || typeof c !== "object") return [];
    const t = c as Record<string, unknown>;
    const name = typeof t.name === "string" ? t.name : "";
    if (!name) return [];
    return [
      {
        name,
        hex: typeof t.hex === "string" && t.hex ? t.hex : undefined,
        image:
          typeof t.image === "string" && t.image
            ? cdnImage(t.image, 100)
            : undefined,
      },
    ];
  });

  return out.length > 0 ? out : undefined;
}

/** "all" / boş → filtr yoxdur; əks halda məhsul mənbəyi (Product.source) üzrə süzülür. */
function platformWhere(platform?: string) {
  return platform && platform !== "all" ? { source: platform } : {};
}

/* -------------------- platforma nişanı (badge) üslubu -------------------- */
/**
 * Platforma rəngləri DB-dədir (qayda #4) — kodda sabit map yoxdur.
 *
 * Hər məhsul sətri üçün ayrıca sorğu atmaq olmaz, ona görə kiçik bir keş
 * saxlanılır. TTL qısadır: admin rəngi dəyişəndə bir dəqiqə ərzində görünür,
 * amma siyahı render-ləri DB-ni yormur.
 */
type PlatformStyle = { bg: string; fg: string; label: string };
const PLATFORM_STYLE_TTL_MS = 60_000;
let platformStyleCache: { at: number; map: Map<string, PlatformStyle> } | null =
  null;

/** Keşi doldurur — siyahı funksiyaları `toProductDTO`-dan ƏVVƏL çağırır. */
async function warmPlatformStyles(): Promise<void> {
  if (
    platformStyleCache &&
    Date.now() - platformStyleCache.at < PLATFORM_STYLE_TTL_MS
  ) {
    return;
  }
  try {
    const rows = await prisma.platform.findMany({
      select: { key: true, nameEn: true, badgeBg: true, badgeFg: true },
    });
    platformStyleCache = {
      at: Date.now(),
      map: new Map(
        rows.map((r) => [
          r.key,
          {
            bg: r.badgeBg ?? "",
            fg: r.badgeFg ?? "",
            label: r.nameEn || r.key,
          },
        ]),
      ),
    };
  } catch {
    // Keş dolmasa nişan neytral fona düşür — siyahı sınmır.
  }
}

/**
 * Siyahı funksiyalarının ehtiyac duyduğu BÜTÜN keşlər.
 *
 * `toProductDTO` sinxrondur (hər sətir üçün `await` atmaq mənasız olardı),
 * ona görə platforma rəngləri və valyuta konfiqurasiyası ondan ƏVVƏL bir
 * dəfə isidilir. İkisi paralel gedir — bir-birindən asılı deyillər.
 */
async function warmCaches(): Promise<void> {
  await Promise.all([warmPlatformStyles(), warmCurrency()]);
}

function platformStyle(source?: string | null): PlatformStyle | undefined {
  if (!source) return undefined;
  return platformStyleCache?.map.get(source);
}

/* ------------------------------ məhsullar ------------------------------ */

/** Trend məhsullar — çox satılan (salesCount) sonra reytinq. */
export async function getTrendingProducts(lang: Lang, take = 10): Promise<ProductDTO[]> {
  await warmCaches();
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: [
      { salesCount: { sort: "desc", nulls: "last" } },
      { rating: "desc" },
      { reviewCount: "desc" },
    ],
    take,
  });
  return rows.map((r) => toProductDTO(r, lang));
}

/** Yeni gələnlər — ən son əlavə olunanlar. */
export async function getNewArrivals(
  lang: Lang,
  take = 12,
  /** Sonsuz scroll üçün — neçə sətir atlanacaq. */
  skip = 0,
): Promise<ProductDTO[]> {
  await warmCaches();
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    // Sabit ikinci açar: eyni `createdAt`-lı sətirlər səhifələr arasında
    // yerini dəyişməsin, yoxsa scroll təkrar/atlama verir.
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    skip,
  });
  return rows.map((r) => toProductDTO(r, lang));
}

export async function getProductById(id: string, lang: Lang): Promise<ProductDTO | null> {
  await warmCaches();
  const p = await prisma.product.findUnique({ where: { id }, include: { category: true } });
  if (!p) return null;
  const categoryName = p.category ? pickLang(p.category, "name", lang) : undefined;
  const dto = toProductDTO(p, lang, categoryName);

  // Variantlar YALNIZ detal səhifəsində hesablanır — siyahılarda lazım deyil,
  // hər məhsul üçün JSONB emalı boş yerə vaxt aparardı.
  // Platforma fərqi adapter qatında həll olunur (qayda #6) — DTO eyni gəlir.
  const variants = getVariants({
    source: p.source,
    attributes: p.attributes,
    raw: p.raw,
    images: dto.images ?? [],
    priceCents: p.priceCents,
    minOrderQty: p.minOrderQty,
  });

  // Variant və topdan pillə qiymətləri də göstəriş valyutasına keçir —
  // əks halda kartda $ , variant seçiləndə ¥ görünərdi.
  dto.variants = {
    ...variants,
    variants: variants.variants.map((v) => ({
      ...v,
      image: v.image ? cdnImage(v.image, GALLERY_SOURCE_WIDTH) : v.image,
      priceCents: display(v.priceCents, p.currency).cents,
      oldPriceCents:
        v.oldPriceCents != null
          ? display(v.oldPriceCents, p.currency).cents
          : undefined,
    })),
    priceTiers: variants.priceTiers.map((tier) => ({
      ...tier,
      priceCents: display(tier.priceCents, p.currency).cents,
    })),
  };

  return dto;
}

/* ------------------------------ kateqoriyalar ------------------------------ */

export async function getCategoriesForHome(lang: Lang): Promise<HomeCategoryDTO[]> {
  const rows = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((c) => ({
    key: c.slug,
    name: pickLang(c, "name", lang),
    nameEn: c.nameEn ?? undefined,
    img: c.image ?? "",
    href: `/category/${c.slug}`,
  }));
}

/**
 * Platformanın ÖZ kateqoriyaları (PlatformCategory) — yuxarı səviyyə (parent = "0").
 * QEYD: Partzona-da kateqoriya ağacı yalnız 1688 üçün var; Taobao-da belə endpoint yoxdur,
 * ona görə taobao üçün boş massiv qayıdır (UI bunu aydın mesajla göstərir).
 */
export async function getPlatformCategories(
  platformKey: string,
  lang: Lang,
  take = 24,
  /**
   * Görünmə sahəsi (admin bazadan idarə edir):
   *  "nav"  → yalnız yuxarı zolaqda göstərilənlər
   *  "home" → yalnız ana səhifə bölməsində göstərilənlər
   *  "all"  → hamısı (/categories səhifəsi)
   */
  scope: "all" | "nav" | "home" = "all",
): Promise<HomeCategoryDTO[]> {
  const rows = await prisma.platformCategory.findMany({
    where: {
      platformKey,
      parentExternalId: "0",
      ...(scope === "nav"
        ? { showInNav: true }
        : scope === "home"
          ? { showOnHome: true }
          : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { externalId: "asc" }],
    take,
  });
  return rows.map((c) => ({
    key: c.externalId,
    name: pickLang(c, "name", lang) || c.nameZh || c.externalId,
    nameEn: c.nameEn ?? undefined,
    // AI ilə generasiya olunmuş şəkil (yoxdursa UI ikona düşür).
    img: c.image ?? "",
    href: `/products?platform=${platformKey}&cat=${c.externalId}`,
  }));
}

/**
 * Verilmiş əsas kateqoriyaların ALT kateqoriyaları (nav dropdown üçün).
 * Nəticə: { valideynExternalId: [alt kateqoriyalar] }
 */
export async function getPlatformSubcategories(
  platformKey: string,
  lang: Lang,
  parentIds: string[],
  // Nav dropdown-u çoxsütunludur — 12 limit alt kateqoriyaların çoxunu gizlədirdi
  // (məs. Zara "Uşaqlar"da 59 var). 60 praktik yuxarı həddir.
  perParent = 60,
): Promise<Record<string, HomeCategoryDTO[]>> {
  if (parentIds.length === 0) return {};

  const rows = await prisma.platformCategory.findMany({
    where: { platformKey, parentExternalId: { in: parentIds } },
    orderBy: { externalId: "asc" },
  });

  const grouped: Record<string, HomeCategoryDTO[]> = {};
  for (const c of rows) {
    const parent = c.parentExternalId ?? "";
    const bucket = (grouped[parent] ??= []);
    if (bucket.length >= perParent) continue;
    bucket.push({
      key: c.externalId,
      name: pickLang(c, "name", lang) || c.nameZh || c.externalId,
      nameEn: c.nameEn ?? undefined,
      img: c.image ?? "",
      href: `/products?platform=${platformKey}&cat=${c.externalId}`,
    });
  }
  return grouped;
}

/**
 * Kateqoriya baxışında SOL PANEL üçün siyahı:
 *  - seçilmiş kateqoriyanın uşaqları varsa → uşaqlar
 *  - yoxdursa (yarpaq kateqoriya) → qardaşları (panel boş qalmasın)
 */
export async function getSidebarSubcategories(
  platformKey: string,
  lang: Lang,
  categoryId: string,
  take = 40,
): Promise<HomeCategoryDTO[]> {
  const toDTO = (c: {
    externalId: string;
    nameAz: string | null;
    nameEn: string | null;
    nameRu: string | null;
    nameZh: string | null;
    image: string | null;
  }): HomeCategoryDTO => ({
    key: c.externalId,
    name: pickLang(c, "name", lang) || c.nameZh || c.externalId,
    nameEn: c.nameEn ?? undefined,
    img: c.image ?? "",
    href: `/products?platform=${platformKey}&cat=${c.externalId}`,
  });

  const children = await prisma.platformCategory.findMany({
    where: { platformKey, parentExternalId: categoryId },
    orderBy: { externalId: "asc" },
    take,
  });
  if (children.length > 0) return children.map(toDTO);

  const self = await prisma.platformCategory.findUnique({
    where: { platformKey_externalId: { platformKey, externalId: categoryId } },
  });
  if (!self?.parentExternalId || self.parentExternalId === "0") return [];

  const siblings = await prisma.platformCategory.findMany({
    where: { platformKey, parentExternalId: self.parentExternalId },
    orderBy: { externalId: "asc" },
    take,
  });
  return siblings.map(toDTO);
}

/* ------------------------------ platformalar ------------------------------ */

/** Yalnız aktiv platformalar (amazon isActive=false → görünmür). */
export async function getActivePlatforms(lang: Lang): Promise<PlatformDTO[]> {
  const rows = await prisma.platform.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((p) => ({
    key: p.key,
    name: pickLang(p, "name", lang),
    tagline: pickLang(p, "tagline", lang),
  }));
}

/* ------------------------------ slaydlar / kampaniyalar ------------------------------ */

export async function getSlides(lang: Lang): Promise<SlideDTO[]> {
  const rows = await prisma.slide.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    title: pickLang(s, "title", lang),
    subtitle: s.subtitle,
    image: s.image,
    href: s.href,
  }));
}

export async function getCampaigns(lang: Lang): Promise<CampaignDTO[]> {
  const rows = await prisma.campaign.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map((c) => ({
    key: c.key,
    eyebrow: pickLang(c, "eyebrow", lang),
    title: pickLang(c, "title", lang),
    cta: pickLang(c, "cta", lang),
    href: c.href,
    img: c.image,
    tint: c.tint,
  }));
}

/* ------------------------------ kataloq / siyahı ------------------------------ */

/** Bütün aktiv məhsullar (products səhifəsi). category = ingilis adı (filtr açarı stabil qalsın). */
export async function getProducts(opts: {
  lang: Lang;
  take?: number;
  skip?: number;
  platform?: string;
  /** Platformanın kateqoriya ID-si — kateqoriya baxışının DB fallback-i. */
  sourceCategoryId?: string;
  /** Brend filtri — `/brands` səhifəsi SERVERDƏ süzür ki, paginasiya düzgün
   *  işləsin (client-side süzgəc yalnız yüklənmiş 20 sətri süzürdü). */
  brand?: string;
}): Promise<ProductDTO[]> {
  await warmCaches();
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      ...platformWhere(opts.platform),
      ...(opts.sourceCategoryId
        ? { sourceCategoryId: opts.sourceCategoryId }
        : {}),
      ...(opts.brand ? { brand: opts.brand } : {}),
    },
    include: { category: true },
    // `id` ən sonda sabit açardır — eyni `salesCount`/`createdAt` dəyərli
    // sətirlər səhifələr arasında yer dəyişməsin (scroll təkrar göstərməsin).
    orderBy: [
      { salesCount: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
      { id: "asc" },
    ],
    take: opts.take,
    skip: opts.skip,
  });
  return rows.map((r) =>
    toProductDTO(r, opts.lang, r.category?.nameEn ?? undefined, r.category?.slug),
  );
}

/** Kateqoriyaya görə (slug) məhsullar — category browse. */
export async function getProductsByCategory(
  slug: string,
  lang: Lang,
  take = 60,
  /** Sonsuz scroll / səhifələmə üçün — neçə sətir atlanacaq. */
  skip = 0,
): Promise<ProductDTO[]> {
  await warmCaches();
  const cat = await prisma.category.findUnique({ where: { slug } });
  if (!cat) return [];
  // LİMİT MƏCBURİDİR — kataloqda minlərlə məhsul var (ölçüldü: 3787).
  // Limitsiz sorğu bütün kateqoriyanı yaddaşa çəkib DTO-ya çevirirdi.
  const rows = await prisma.product.findMany({
    where: { isActive: true, categoryId: cat.id },
    orderBy: { createdAt: "desc" },
    take,
    skip,
  });
  return rows.map((r) => toProductDTO(r, lang));
}

/** Endirimli məhsullar (deals / sale) — köhnə qiyməti olanlar. */
export async function getDeals(
  lang: Lang,
  take = 60,
  /** Seçilmiş platforma — "all"/boş olsa filtr tətbiq olunmur. */
  platform?: string,
  /** Sonsuz scroll üçün — neçə sətir atlanacaq. */
  skip = 0,
): Promise<ProductDTO[]> {
  await warmCaches();
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      oldPriceCents: { not: null },
      ...platformWhere(platform),
    },
    // `id` ikinci açar kimi — səhifələmə sabit qalsın (bax: getNewArrivals).
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
    skip,
  });
  return rows.map((r) => toProductDTO(r, lang));
}

/** Fərqli brendlərin siyahısı (brands səhifəsi filtri). */
/**
 * Verilmiş ID-lərə görə məhsullar — SIRA QORUNUR.
 * Canlı Partzona axtarışı üçün: import olunan məhsullar platformanın
 * sıralaması ilə göstərilməlidir (DB-ni açar sözlə yenidən axtarmaq olmaz,
 * çünki import olunan adlar ingiliscədir, sorğu isə azərbaycanca).
 */
export async function getProductsByIds(
  ids: string[],
  lang: Lang,
): Promise<ProductDTO[]> {
  await warmCaches();
  if (ids.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { category: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids
    .map((id) => byId.get(id))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map((r) =>
      toProductDTO(r, lang, r.category?.nameEn ?? undefined, r.category?.slug),
    );
}

/**
 * Brend filtri üçün siyahı — SEÇİLMİŞ platformaya görə.
 *
 * Platformalarda "brend" fərqli mənalıdır və bunu uydurmaqla düzəltmirik:
 *   · Zara  → tək brenddir (hər məhsul "zara"), filtr mənasızdır
 *   · 1688  → axtarış cavabında brend YOXDUR, mənbə adına düşür
 *   · Taobao→ dəyər əslində MAĞAZA adıdır (brend deyil)
 * Ona görə tək dəyər qalırsa boş massiv qaytarırıq — UI filtri göstərmir.
 */
export async function getBrands(platform?: string): Promise<string[]> {
  // `distinct` Prisma-da TƏTBİQ QATINDA işləyir: baza bütün sətirləri
  // qaytarır, təkrarlar sonra atılır. Yəni limitsiz sorğu bütün kataloqu
  // (ölçüldü: 3787 sətir) çəkirdi. Aqreqasiya ilə eyni nəticə bazada alınır.
  const rows = await prisma.product.groupBy({
    by: ["brand"],
    where: { isActive: true, ...platformWhere(platform) },
    orderBy: { brand: "asc" },
    // Filtr siyahısıdır — 200 brend onsuz da UI-da göstərilə bilməz.
    take: 200,
  });

  const brands = rows
    .map((r) => r.brand)
    .filter((b) => b && b.trim().length > 0);

  // Tək variant filtr deyil — seçim təklif etmək yanlış təəssürat yaradır.
  return brands.length > 1 ? brands : [];
}

/** Bənzər məhsullar (məhsul detalında). */
export async function getRelatedProducts(
  excludeId: string,
  lang: Lang,
  take = 4,
): Promise<ProductDTO[]> {
  await warmCaches();
  const rows = await prisma.product.findMany({
    where: { isActive: true, id: { not: excludeId } },
    orderBy: { rating: "desc" },
    take,
  });
  return rows.map((r) => toProductDTO(r, lang));
}

/**
 * DB kataloqunda dil-həssas axtarış (ad + trilingual adlar + brend).
 * TODO(partzona/otapi): canlı platforma axtarışı (icazə gələndə) bura əlavə olunacaq —
 * sorğu AI ilə çincəyə tərcümə → seçilmiş platformada axtar → DB-yə upsert → nəticə.
 */
export async function searchProducts(opts: {
  lang: Lang;
  query: string;
  take?: number;
  platform?: string;
}): Promise<ProductDTO[]> {
  await warmCaches();
  const q = opts.query.trim();
  if (!q) return [];
  const rows = await prisma.product.findMany({
    where: {
      isActive: true,
      ...platformWhere(opts.platform),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { nameAz: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { nameRu: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    },
    include: { category: true },
    orderBy: { rating: "desc" },
    take: opts.take ?? 60,
  });
  return rows.map((r) =>
    toProductDTO(r, opts.lang, r.category?.nameEn ?? undefined, r.category?.slug),
  );
}
