import "server-only";

// Partzona TAOBAO cavablarını `Product` sxeminə normalize edir.
// Sahə adları CANLI cavabdan təsdiqlənib — 1688-dən CİDDİ fərqlənir:
//
//   axtarış : { data: { data: [...], page_no, page_size }, code }   ← `result` YOXDUR
//   detal   : { data: { ...,  sku_list: [...] }, success: true }    ← `success` BOOLEAN
//   1688-də : { result: { result: {...}, success: "true" } }        ← `success` STRİNQ
//
// QİYMƏT VAHİDİ FƏRQLİDİR (canlı yoxlanılıb):
//   axtarışda  price: "22.80"  → YUAN, sətir
//   detalda    price: 3280     → FEN, tam ədəd
// Bunu qarışdırmaq qiyməti 100 dəfə səhv göstərər.

const SOURCE = "taobao";

/** Yuan sətri → sent (məs. "22.80" → 2280). */
function yuanToCents(v: unknown): number {
  const n = parseFloat(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Fen tam ədədi → sent (eyni vahiddir, sadəcə təhlükəsiz çevirmə). */
function fenToCents(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function itemUrl(itemId: string): string {
  return `https://item.taobao.com/item.htm?id=${itemId}`;
}

/** Rəng oxudurmu — SKU şəkli yalnız rəng dəyərinə bağlanmalıdır. */
function isColorProp(name: string): boolean {
  return /颜色|颜色分类|色|colou?r/i.test(name);
}

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

/* ------------------------------- AXTARIŞ ------------------------------- */

export type RawTaobaoProduct = {
  item_id?: number | string;
  title?: string;
  multi_language_info?: { language?: string; title?: string; main_image_url?: string };
  main_image_url?: string;
  price?: string;
  coupon_price?: string;
  inventory?: number;
  shop_name?: string;
  shopDsr?: string;
  shippingOrigin?: string;
  mi_id?: string;
  tags?: unknown[];
  promotion_displays?: unknown[];
  [k: string]: unknown;
};

/**
 * `{ data: { data: [...], page_no, page_size } }` — canlı forma.
 * DİQQƏT: cavabda ÜMUMİ SAY sahəsi YOXDUR (yalnız səhifə ölçüsü), ona görə
 * `total` səhifədəki element sayıdır — sonsuz scroll bununla işləyir.
 */
export function extractTaobaoSearch(res: unknown): {
  items: RawTaobaoProduct[];
  total: number;
} {
  const data = (res as { data?: { data?: RawTaobaoProduct[] } })?.data;
  const items = Array.isArray(data?.data) ? data!.data! : [];
  return { items, total: items.length };
}

export function normalizeTaobaoProduct(p: RawTaobaoProduct) {
  const externalId = String(p.item_id ?? "");
  const nameEn = p.multi_language_info?.title?.trim() || null;
  const title = nameEn || p.title || externalId;
  const image = p.main_image_url || p.multi_language_info?.main_image_url || "";
  const rating = parseFloat(String(p.shopDsr ?? "0"));
  const listCents = yuanToCents(p.price);
  const couponCents = yuanToCents(p.coupon_price);

  return {
    externalId,
    source: SOURCE,
    name: title,
    nameEn,
    brand: p.shop_name || "Taobao",
    // ENDİRİM: `coupon_price` kupon tətbiq olunmuş SON qiymətdir. Göstərilən
    // qiymət o olmalıdır, `price` isə üstündən xətt çəkilən köhnə qiymət —
    // 1688-in `promotion_price` məntiqi ilə eyni (detal normalizerinə bax).
    // Kupon yoxdursa və ya endirim deyilsə (>= price), köhnə qiymət yazılmır.
    priceCents: listCents > 0 && couponCents > 0 && couponCents < listCents
      ? couponCents
      : listCents,
    oldPriceCents:
      listCents > 0 && couponCents > 0 && couponCents < listCents
        ? listCents
        : null,
    currency: "CNY",
    image,
    images: JSON.stringify(image ? [image] : []),
    rating: Number.isFinite(rating) ? rating : 0,
    // Taobao axtarışı satış sayı vermir — detalda da yoxdur.
    salesCount: null,
    // Taobao pərakəndədir: minimum sifariş 1 (1688-dəki 起订量 anlayışı yoxdur).
    minOrderQty: 1,
    stock: typeof p.inventory === "number" ? p.inventory : 999,
    isActive: true,
    sourceUrl: itemUrl(externalId),
    attributes: {
      miId: p.mi_id ?? null,
      shopName: p.shop_name ?? null,
      shopDsr: p.shopDsr ?? null,
      shippingOrigin: p.shippingOrigin ?? null,
      couponPriceCents: yuanToCents(p.coupon_price) || null,
      promotions: p.promotion_displays ?? null,
      tags: p.tags ?? null,
    } as unknown as object,
    raw: p as unknown as object,
  };
}

/* -------------------------------- DETAL -------------------------------- */

export type RawTaobaoSku = {
  sku_id?: number | string;
  mp_skuId?: number | string;
  quantity?: number;
  price?: number;
  promotion_price?: number;
  coupon_price?: number;
  pic_url?: string;
  status?: string;
  properties?: {
    prop_name?: string;
    prop_id?: number | string;
    value_name?: string;
    value_id?: number | string;
  }[];
};

export type RawTaobaoDetail = {
  item_id?: number | string;
  title?: string;
  description?: string;
  pic_urls?: string[];
  price?: number;
  promotion_price?: number;
  coupon_price?: number;
  quantity?: number;
  begin_amount?: number;
  shop_name?: string;
  shop_id?: number | string;
  category_id?: string;
  category_name?: string;
  category_path?: string;
  item_type?: string;
  status?: string;
  mi_id?: string;
  mp_id?: string;
  sku_list?: RawTaobaoSku[];
  [k: string]: unknown;
};

/** `{ data: {...}, success: true }` — 1688-dən fərqli olaraq `success` BOOLEAN. */
export function extractTaobaoDetail(res: unknown): RawTaobaoDetail | null {
  const r = res as { data?: unknown; success?: unknown };
  const ok = r?.success === true || String(r?.success) === "true";
  if (!ok || !r.data || typeof r.data !== "object") return null;
  return r.data as RawTaobaoDetail;
}

/** SKU matrisindən verilmiş ox üzrə unikal dəyərlər (ölçü siyahısı üçün). */
function optionValues(d: RawTaobaoDetail, match: RegExp): string[] {
  const out = new Set<string>();
  for (const sku of d.sku_list ?? []) {
    for (const p of sku.properties ?? []) {
      if (match.test(p.prop_name ?? "")) {
        const v = (p.value_name ?? "").trim();
        if (v) out.add(v);
      }
    }
  }
  return [...out];
}

/**
 * Detal cavabını `Product` UPDATE payload-ına çevirir.
 * `attributes.variants` 1688 ilə EYNİ formadadır ki, ortaq variant adapteri
 * hər iki platformada dəyişmədən işləsin (qayda #6).
 */
export function normalizeTaobaoDetail(d: RawTaobaoDetail) {
  const images = (d.pic_urls ?? []).filter(Boolean);
  const listPrice = fenToCents(d.price);
  const promoPrice = fenToCents(d.promotion_price);

  // Göstərilən qiymət — endirimli (promotion), köhnə qiymət isə siyahı qiyməti.
  const priceCents = promoPrice || listPrice;
  const oldPriceCents = listPrice > promoPrice && promoPrice > 0 ? listPrice : null;

  const variants = (d.sku_list ?? []).map((s) => ({
    skuId: s.sku_id != null ? String(s.sku_id) : null,
    // Sifariş verərkən Taobao `mp_skuId` istəyir — 1688-dəki `specId` rolunda.
    specId: s.mp_skuId != null ? String(s.mp_skuId) : null,
    priceCents: fenToCents(s.promotion_price) || fenToCents(s.price),
    stock: s.quantity ?? 0,
    cargoNumber: null,
    options: (s.properties ?? []).map((p) => ({
      name: p.prop_name ?? "",
      value: p.value_name ?? "",
      // Taobao şəkli SKU səviyyəsindədir; onu YALNIZ rəng oxuna bağlayırıq,
      // əks halda ölçü seçimi də şəkli dəyişdirərdi.
      image: isColorProp(p.prop_name ?? "") ? (s.pic_url ?? null) : null,
    })),
  }));

  const sizes = optionValues(d, /尺码|尺寸|size/i);
  const text = htmlToText(d.description);

  return {
    ...(d.title ? { name: d.title } : {}),
    ...(text ? { description: text.slice(0, 4000), descEn: text.slice(0, 4000) } : {}),
    ...(images.length ? { image: images[0], images: JSON.stringify(images) } : {}),
    ...(sizes.length ? { sizes: JSON.stringify(sizes) } : {}),
    ...(priceCents > 0 ? { priceCents } : {}),
    ...(oldPriceCents ? { oldPriceCents } : {}),
    stock: d.quantity ?? 0,
    minOrderQty: typeof d.begin_amount === "number" && d.begin_amount > 0 ? d.begin_amount : 1,
    sourceUrl: itemUrl(String(d.item_id ?? "")),
    sourceCategoryId: d.category_id ? String(d.category_id) : null,
    attributes: {
      variants,
      // Taobao ayrıca atribut cədvəli vermir — mövcud məlumatı spec kimi göstəririk.
      specs: [
        d.category_name ? { name: "Category", value: d.category_name } : null,
        d.shop_name ? { name: "Shop", value: d.shop_name } : null,
        d.item_type ? { name: "Type", value: d.item_type } : null,
      ].filter(Boolean),
      priceTiers: [],
      unit: null,
      seller: d.shop_name ?? null,
      video: null,
      miId: d.mi_id ?? null,
      mpId: d.mp_id ?? null,
      couponPriceCents: fenToCents(d.coupon_price) || null,
      categoryPath: d.category_path ?? null,
    } as unknown as object,
    raw: d as unknown as object,
  };
}

/** Detal cavabından TAM `Product` create payload-ı (kateqoriya importu üçün). */
export function taobaoDetailToCreatePayload(d: RawTaobaoDetail) {
  const externalId = String(d.item_id ?? "");
  const patch = normalizeTaobaoDetail(d);

  return {
    externalId,
    source: SOURCE,
    name: d.title || externalId,
    brand: d.shop_name || "Taobao",
    currency: "CNY",
    isActive: true,
    image: "",
    priceCents: 0,
    rating: 0,
    ...patch,
  };
}
