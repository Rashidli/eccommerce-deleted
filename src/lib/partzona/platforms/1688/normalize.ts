import "server-only";

// Partzona 1688 axtarış cavabını bizim `Product` sxeminə normalize edir.
// Sahə adları CANLI cavabdan təsdiqlənib (offerId, subjectTrans, priceInfo.price, ...).
// Orijinal obyekt həmişə `raw`-da saxlanır — heç nə itmir (qayda #6).

/** 1688 axtarış nəticəsindəki bir məhsul (canlı cavabdan). */
export type Raw1688Product = {
  offerId: number | string;
  subject?: string;
  subjectTrans?: string;
  imageUrl?: string;
  priceInfo?: { price?: string; consignPrice?: string };
  monthSold?: number;
  tradeScore?: string;
  minOrderQuantity?: number;
  topCategoryId?: number;
  secondCategoryId?: number;
  promotionURL?: string;
  repurchaseRate?: string;
  isJxhy?: boolean;
  isOnePsale?: boolean;
  sellerIdentities?: string[];
  sellerDataInfo?: Record<string, unknown>;
  [k: string]: unknown;
};

/** `{ result: { result: { data: [...] , totalRecords } } }` — canlı formanı açır. */
export function extract1688Search(res: unknown): {
  items: Raw1688Product[];
  total: number;
} {
  const inner = (res as { result?: { result?: unknown } })?.result?.result as
    | { data?: Raw1688Product[]; totalRecords?: number }
    | undefined;
  return {
    items: Array.isArray(inner?.data) ? inner!.data! : [],
    total: Number(inner?.totalRecords ?? 0),
  };
}

function toCents(price?: string): number {
  const n = parseFloat(String(price ?? "0").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Prisma `Product` upsert üçün sahələr (create və update-də eyni istifadə olunur). */
export function normalize1688Product(p: Raw1688Product) {
  const externalId = String(p.offerId);
  const title = p.subjectTrans || p.subject || externalId;
  const image = p.imageUrl ?? "";
  const rating = parseFloat(String(p.tradeScore ?? "0"));

  return {
    externalId,
    source: "1688",
    name: title,
    nameEn: p.subjectTrans ?? null,
    brand: "1688",
    priceCents: toCents(p.priceInfo?.price),
    currency: "CNY",
    image,
    images: JSON.stringify(image ? [image] : []),
    rating: Number.isFinite(rating) ? rating : 0,
    salesCount: typeof p.monthSold === "number" ? p.monthSold : null,
    minOrderQty: typeof p.minOrderQuantity === "number" ? p.minOrderQuantity : 1,
    // Axtarış cavabı stok vermir — satıla bilən sayılır (detal sorğusunda dəqiqləşir).
    stock: 999,
    isActive: true,
    sourceCategoryId:
      p.secondCategoryId != null
        ? String(p.secondCategoryId)
        : p.topCategoryId != null
          ? String(p.topCategoryId)
          : null,
    sourceUrl:
      p.promotionURL ?? `https://detail.1688.com/offer/${externalId}.html`,
    attributes: {
      monthSold: p.monthSold ?? null,
      tradeScore: p.tradeScore ?? null,
      minOrderQuantity: p.minOrderQuantity ?? null,
      repurchaseRate: p.repurchaseRate ?? null,
      isJxhy: p.isJxhy ?? null,
      isOnePsale: p.isOnePsale ?? null,
      sellerIdentities: p.sellerIdentities ?? null,
      sellerDataInfo: p.sellerDataInfo ?? null,
    } as unknown as object,
    raw: p as unknown as object,
  };
}

/* ==========================================================================
 * KATEQORİYA MƏHSULLARI  —  GET /categories/{id}/products
 * ==========================================================================
 * DİQQƏT: bu endpoint axtarışdan FƏRQLİ cavab verir — tam məhsul yox,
 * yalnız ID siyahısı qaytarır (canlı yoxlanılıb):
 *   { result: { success: "true", code: "200",
 *               result: [ { offerId, offerPoolTotal }, ... ] } }
 * Ona görə hər ID üçün ayrıca detal sorğusu atılmalıdır.
 * `success` burada STRİNQ ("true"/"false"), detalda isə boolean-dır.
 */

function isOk(success: unknown): boolean {
  return success === true || String(success) === "true";
}

export function extract1688CategoryOfferIds(res: unknown): {
  offerIds: string[];
  total: number;
  error?: string;
} {
  const outer = (res as { result?: Record<string, unknown> })?.result;
  if (!outer) return { offerIds: [], total: 0, error: "boş cavab" };

  if (!isOk(outer.success)) {
    // Məs. F0021 — kateqoriya offer pool-da yoxdur.
    return {
      offerIds: [],
      total: 0,
      error: `${outer.code ?? ""} ${outer.message ?? ""}`.trim(),
    };
  }

  const list = Array.isArray(outer.result)
    ? (outer.result as { offerId?: number | string; offerPoolTotal?: number }[])
    : [];

  return {
    offerIds: list.map((o) => String(o.offerId)).filter((id) => id && id !== "undefined"),
    total: Number(list[0]?.offerPoolTotal ?? list.length),
  };
}

/** `GET /categories/{id}/products/total` → `{ result: { success, model } }` */
export function extract1688CategoryTotal(res: unknown): number {
  const outer = (res as { result?: { model?: number } })?.result;
  return Number(outer?.model ?? 0);
}

/* ==========================================================================
 * MƏHSUL DETALI  —  GET /products/{offerId}
 * ========================================================================== */

type SkuAttribute = {
  attributeName?: string;
  attributeNameTrans?: string;
  value?: string;
  valueTrans?: string;
  skuImageUrl?: string;
};

export type Raw1688Detail = {
  offerId?: number | string;
  subject?: string;
  subjectTrans?: string;
  description?: string;
  productImage?: { images?: string[] };
  productAttribute?: {
    attributeName?: string;
    attributeNameTrans?: string;
    value?: string;
    valueTrans?: string;
  }[];
  productSkuInfos?: {
    amountOnSale?: number;
    skuId?: number | string;
    specId?: string;
    consignPrice?: string;
    cargoNumber?: string;
    skuAttributes?: SkuAttribute[];
  }[];
  productSaleInfo?: {
    amountOnSale?: number;
    priceRangeList?: { startQuantity?: number; price?: string }[];
    unitInfo?: { unit?: string; transUnit?: string };
  };
  minOrderQuantity?: number;
  soldOut?: string | number;
  tradeScore?: string;
  promotionUrl?: string;
  companyName?: string;
  mainVideo?: string;
  topCategoryId?: number;
  secondCategoryId?: number;
  sellingPoint?: string[];
  [k: string]: unknown;
};

/** `{ result: { success: true, code: "200", result: {...} } }` */
export function extract1688Detail(res: unknown): Raw1688Detail | null {
  const outer = (res as { result?: Record<string, unknown> })?.result;
  if (!outer || !isOk(outer.success)) return null;
  const inner = outer.result;
  return inner && typeof inner === "object" ? (inner as Raw1688Detail) : null;
}

/** HTML təsviri düz mətnə çevirir (1688 təsvirləri əsasən şəkillidir). */
function htmlToText(html?: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** SKU matrisindən verilmiş atribut adına görə unikal dəyərlər (Size / Color). */
function optionValues(detail: Raw1688Detail, nameTrans: RegExp): string[] {
  const out = new Set<string>();
  for (const sku of detail.productSkuInfos ?? []) {
    for (const a of sku.skuAttributes ?? []) {
      if (nameTrans.test(a.attributeNameTrans ?? "")) {
        const v = (a.valueTrans || a.value || "").trim();
        if (v) out.add(v);
      }
    }
  }
  return [...out];
}

/**
 * Detal cavabını `Product` UPDATE payload-ına çevirir.
 * Sifariş vermək üçün `specId`/`skuId` vacibdir — hamısı `attributes.variants`-də saxlanır.
 */
export function normalize1688Detail(d: Raw1688Detail) {
  const images = (d.productImage?.images ?? []).filter(Boolean);
  const tiers = d.productSaleInfo?.priceRangeList ?? [];

  // Ən aşağı pillə qiyməti — kartda göstərilən qiymət.
  const priceCents = tiers.length
    ? Math.min(...tiers.map((t) => toCents(t.price)).filter((n) => n > 0))
    : 0;

  const variants = (d.productSkuInfos ?? []).map((s) => ({
    skuId: s.skuId != null ? String(s.skuId) : null,
    specId: s.specId ?? null,
    priceCents: toCents(s.consignPrice),
    stock: s.amountOnSale ?? 0,
    cargoNumber: s.cargoNumber ?? null,
    options: (s.skuAttributes ?? []).map((a) => ({
      name: a.attributeNameTrans || a.attributeName || "",
      value: a.valueTrans || a.value || "",
      image: a.skuImageUrl ?? null,
    })),
  }));

  const specs = (d.productAttribute ?? []).map((a) => ({
    name: a.attributeNameTrans || a.attributeName || "",
    value: a.valueTrans || a.value || "",
  }));

  const sizes = optionValues(d, /size|尺码/i);
  const text = htmlToText(d.description) || (d.sellingPoint ?? []).join(". ");
  const rating = parseFloat(String(d.tradeScore ?? "0"));

  return {
    // Yalnız dolu gələn sahələri yeniləyirik — boş dəyər mövcudu silməsin.
    ...(d.subjectTrans ? { nameEn: d.subjectTrans } : {}),
    ...(text ? { description: text.slice(0, 4000), descEn: text.slice(0, 4000) } : {}),
    ...(images.length ? { image: images[0], images: JSON.stringify(images) } : {}),
    ...(sizes.length ? { sizes: JSON.stringify(sizes) } : {}),
    ...(priceCents > 0 ? { priceCents } : {}),
    ...(Number.isFinite(rating) && rating > 0 ? { rating } : {}),
    stock: d.productSaleInfo?.amountOnSale ?? 0,
    minOrderQty: typeof d.minOrderQuantity === "number" ? d.minOrderQuantity : 1,
    salesCount: Number(d.soldOut ?? 0) || null,
    sourceUrl:
      d.promotionUrl ?? `https://detail.1688.com/offer/${d.offerId}.html`,
    sourceCategoryId:
      d.secondCategoryId != null
        ? String(d.secondCategoryId)
        : d.topCategoryId != null
          ? String(d.topCategoryId)
          : null,
    attributes: {
      variants,
      specs,
      priceTiers: tiers,
      unit: d.productSaleInfo?.unitInfo?.transUnit ?? null,
      seller: d.companyName ?? null,
      video: d.mainVideo ?? null,
      sellingPoint: d.sellingPoint ?? null,
    } as unknown as object,
    raw: d as unknown as object,
  };
}

/** Detal cavabından TAM `Product` create payload-ı (kateqoriya importu üçün). */
export function detailToCreatePayload(d: Raw1688Detail) {
  const externalId = String(d.offerId);
  const patch = normalize1688Detail(d);
  const title = d.subjectTrans || d.subject || externalId;

  return {
    externalId,
    source: "1688",
    name: title,
    brand: "1688",
    currency: "CNY",
    isActive: true,
    image: "",
    priceCents: 0,
    ...patch,
  };
}
