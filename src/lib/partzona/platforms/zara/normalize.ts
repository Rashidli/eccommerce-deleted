import "server-only";

// Zara "ES Data API" cavablarını `Product` sxeminə normalize edir.
// Zara 1688/Taobao-dan struktur olaraq TAM fərqlidir (canlı yoxlanılıb):
//
//   axtarış/kateqoriya : { data: [{ id, name, price, oldPrice, currency:"EUR",
//                          seo:{seoProductId}, url, colors, images, ... }], pagination }
//   detal              : { data: { id, name, description, material, composition,
//                          colors:[{ id, name, hexCode, price, images:[{url}],
//                          sizes:[{ sku, skuCode, name, price, oldPrice, availability }] }] } }
//
// FƏRQLƏR:
//   · Qiymət ONDALIQ EUR (35.95), sent DEYİL → *100.
//   · Detalda TOP-LEVEL `price` NULL — real qiymət rəng/ölçü səviyyəsindədir.
//   · Rəngin ƏSL hex kodu var (`hexCode`) — 1688/Taobao vermir. Uydurmuruq, işlədirik.
//   · Şəkil rəng səviyyəsindədir (`colors[].images[].url`).

const SOURCE = "zara";

/** Ondalıq EUR → sent (35.95 → 3595). Sətir də, ədəd də qəbul edir. */
function eurToCents(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

/** Zara stok statusunu ədədi stoka çevirir (dəqiq say vermir). */
function availabilityToStock(av: unknown): number {
  const s = String(av ?? "").toLowerCase();
  if (s === "out_of_stock" || s === "coming_soon" || s === "sold_out") return 0;
  if (s === "low_on_stock") return 3;
  return 999; // in_stock və s.
}

/** `images` elementi obyekt ({url}) və ya sətir ola bilər — həmişə URL qaytarır. */
function imageUrl(img: unknown): string {
  if (typeof img === "string") return img.trim();
  if (img && typeof img === "object") {
    const u = (img as { url?: unknown }).url;
    if (typeof u === "string") return u.trim();
  }
  return "";
}

function imageList(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map(imageUrl).filter((u) => u.length > 0);
}

/* ------------------------------- AXTARIŞ / KATEQORİYA ------------------------------- */

export type RawZaraColorThumb = {
  id?: string;
  name?: string;
  hexCode?: string;
  images?: unknown[];
};

export type RawZaraListItem = {
  id?: number | string;
  name?: string;
  reference?: string;
  displayReference?: string;
  price?: number | string | null;
  oldPrice?: number | string | null;
  currency?: string;
  availability?: string;
  section?: string;
  family?: string;
  subfamily?: string;
  brand?: string;
  seo?: { keyword?: string; seoProductId?: string };
  detailPath?: string;
  url?: string;
  colors?: RawZaraColorThumb[];
  images?: unknown[];
  hasSizes?: boolean;
  [k: string]: unknown;
};

/** `{ success, pagination:{total,...}, data:[...] }` — axtarış və kateqoriya eyni forma. */
export function extractZaraList(res: unknown): {
  items: RawZaraListItem[];
  total: number;
} {
  const r = res as {
    data?: RawZaraListItem[];
    pagination?: { total?: number };
    totalBeforeFilter?: number;
  };
  const items = Array.isArray(r?.data) ? r.data : [];
  const total =
    (typeof r?.pagination?.total === "number" ? r.pagination.total : undefined) ??
    (typeof r?.totalBeforeFilter === "number" ? r.totalBeforeFilter : undefined) ??
    items.length;
  return { items, total };
}

/**
 * Axtarış/kateqoriya elementini normalize edir.
 * `externalId` = `seo.seoProductId` (detal endpoint-i bunu istəyir).
 */
export function normalizeZaraListItem(p: RawZaraListItem) {
  const externalId = String(p.seo?.seoProductId ?? p.id ?? "").trim();

  // Şəkil: element özündə `images`, yoxsa ilk rəngin şəkli.
  let images = imageList(p.images);
  if (images.length === 0 && Array.isArray(p.colors)) {
    for (const c of p.colors) {
      const ci = imageList(c?.images);
      if (ci.length) {
        images = ci;
        break;
      }
    }
  }
  const image = images[0] ?? "";

  const priceCents = eurToCents(p.price);
  const oldCents = eurToCents(p.oldPrice);

  // Rəng seçimləri (əsl hex ilə) — kartda kiçik önizləmə üçün attributes-də saxlanır.
  const colorThumbs = (Array.isArray(p.colors) ? p.colors : []).map((c) => ({
    id: c?.id ?? null,
    name: c?.name ?? null,
    hex: c?.hexCode ?? null,
    image: imageList(c?.images)[0] ?? null,
  }));

  return {
    externalId,
    source: SOURCE,
    name: p.name || externalId,
    nameEn: p.name || null,
    brand: p.brand || "Zara",
    priceCents,
    // Zara `oldPrice` yalnız endirimdə dolur — köhnə qiymət cari-dən böyük olmalıdır.
    oldPriceCents: oldCents > priceCents ? oldCents : null,
    currency: p.currency || "EUR",
    image,
    images: JSON.stringify(images.length ? images : image ? [image] : []),
    rating: 0, // Zara reytinq vermir.
    salesCount: null,
    minOrderQty: 1,
    stock: availabilityToStock(p.availability),
    isActive: true,
    sourceUrl: p.url || null,
    attributes: {
      section: p.section ?? null,
      family: p.family ?? null,
      subfamily: p.subfamily ?? null,
      reference: p.reference ?? null,
      displayReference: p.displayReference ?? null,
      availability: p.availability ?? null,
      hasSizes: p.hasSizes ?? null,
      colorThumbs,
    } as unknown as object,
    raw: p as unknown as object,
  };
}

/* -------------------------------- DETAL -------------------------------- */

export type RawZaraSize = {
  sku?: number | string;
  skuCode?: string;
  sizeId?: number | string;
  name?: string;
  price?: number | string;
  oldPrice?: number | string | null;
  availability?: string;
  reference?: string;
  [k: string]: unknown;
};

export type RawZaraColor = {
  id?: string;
  name?: string;
  hexCode?: string;
  productId?: number | string;
  reference?: string;
  price?: number | string;
  description?: string;
  url?: string;
  images?: unknown[];
  sizes?: RawZaraSize[];
  totalSizes?: number;
  inStockSizes?: number;
  [k: string]: unknown;
};

export type RawZaraDetail = {
  id?: number | string;
  name?: string;
  reference?: string;
  displayReference?: string;
  description?: string;
  brand?: string;
  currency?: string;
  section?: string;
  family?: string;
  subfamily?: string;
  material?: string;
  composition?: unknown;
  url?: string;
  images?: unknown[];
  colors?: RawZaraColor[];
  variantCount?: number;
  seo?: { seoProductId?: string };
  [k: string]: unknown;
};

/** `{ success, data:{...} }` → detal obyekti (yoxsa null). */
export function extractZaraDetail(res: unknown): RawZaraDetail | null {
  const r = res as { success?: unknown; data?: unknown };
  const ok = r?.success === true || String(r?.success) === "true";
  if (!ok || !r.data || typeof r.data !== "object") return null;
  return r.data as RawZaraDetail;
}

function cleanText(s?: string): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Detal cavabını `Product` UPDATE payload-ına çevirir.
 *
 * `attributes.variants` — ORTAQ variant forması (1688/Taobao ilə eyni struktur):
 * hər variant `{ skuId, options:[{name,value,image,swatch}], priceCents, stock }`.
 * Rəng oxunda `swatch` (əsl hex) və `image` var — Zara adapteri bunları işlədir.
 */
export function normalizeZaraDetail(d: RawZaraDetail) {
  const colors = Array.isArray(d.colors) ? d.colors : [];

  // Bütün rənglərin şəkilləri — qalereya üçün (ilk rəngdən başlayaraq).
  const allImages: string[] = [];
  for (const c of colors) {
    for (const u of imageList(c.images)) {
      if (!allImages.includes(u)) allImages.push(u);
    }
  }

  // Variant matrisi: hər (rəng × ölçü) bir SKU.
  const variants: Array<Record<string, unknown>> = [];
  const sizeNames = new Set<string>();
  let minCents = Infinity;
  let anyOldCents = 0;

  for (const c of colors) {
    const colorImage = imageList(c.images)[0] ?? null;
    const colorName = c.name ?? "";
    const colorHex = c.hexCode ?? null;
    const sizes = Array.isArray(c.sizes) ? c.sizes : [];

    if (sizes.length === 0) {
      // Ölçüsüz məhsul (məs. parfüm) — yalnız rəng oxu.
      const cents = eurToCents(c.price);
      if (cents > 0) minCents = Math.min(minCents, cents);
      variants.push({
        skuId: c.reference ?? c.id ?? null,
        specId: c.id ?? null,
        priceCents: cents,
        stock: 999,
        options: [
          { name: "Color", value: colorName, image: colorImage, swatch: colorHex },
        ],
      });
      continue;
    }

    for (const s of sizes) {
      const cents = eurToCents(s.price) || eurToCents(c.price);
      const oldCents = eurToCents(s.oldPrice);
      if (cents > 0) minCents = Math.min(minCents, cents);
      if (oldCents > cents) anyOldCents = Math.max(anyOldCents, oldCents);
      const sizeName = s.name ?? "";
      if (sizeName) sizeNames.add(sizeName);

      variants.push({
        skuId: s.sku != null ? String(s.sku) : (s.skuCode ?? null),
        specId: s.skuCode ?? null,
        priceCents: cents,
        oldPriceCents: oldCents > cents ? oldCents : undefined,
        stock: availabilityToStock(s.availability),
        options: [
          // Rəng oxu: şəkil + əsl hex swatch (Zara-nın üstünlüyü).
          { name: "Color", value: colorName, image: colorImage, swatch: colorHex },
          { name: "Size", value: sizeName, image: null },
        ],
      });
    }
  }

  const priceCents = Number.isFinite(minCents) ? minCents : 0;
  const description = cleanText(d.description);
  const composition = Array.isArray(d.composition)
    ? d.composition
    : d.composition
      ? [d.composition]
      : [];

  const specs = [
    d.material ? { name: "Material", value: cleanText(d.material) } : null,
    d.section ? { name: "Section", value: String(d.section) } : null,
    d.family ? { name: "Family", value: String(d.family) } : null,
    d.reference ? { name: "Reference", value: String(d.reference) } : null,
  ].filter(Boolean);

  return {
    ...(d.name ? { name: d.name, nameEn: d.name } : {}),
    ...(description
      ? { description: description.slice(0, 4000), descEn: description.slice(0, 4000) }
      : {}),
    ...(allImages.length
      ? { image: allImages[0], images: JSON.stringify(allImages) }
      : {}),
    ...(sizeNames.size ? { sizes: JSON.stringify([...sizeNames]) } : {}),
    ...(priceCents > 0 ? { priceCents } : {}),
    ...(anyOldCents > priceCents ? { oldPriceCents: anyOldCents } : {}),
    currency: d.currency || "EUR",
    minOrderQty: 1,
    ...(d.url ? { sourceUrl: d.url } : {}),
    attributes: {
      variants,
      specs,
      priceTiers: [],
      unit: null,
      material: d.material ?? null,
      composition,
      section: d.section ?? null,
      variantCount: d.variantCount ?? null,
    } as unknown as object,
    raw: d as unknown as object,
  };
}
