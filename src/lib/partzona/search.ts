import "server-only";
import { prisma } from "@/lib/prisma";
import { translateQuery } from "@/lib/ai/translate";
import { getPlatformService } from "./platforms";
import { translateProductsInBackground } from "@/lib/ai/translate-products";
import type { CategoryInfo, ProductWriteData } from "./platforms/types";
import type { Lang } from "@/lib/i18n";

/**
 * PLATFORMADAN ASILI OLMAYAN import qatı.
 *
 * Bu fayl HEÇ BİR platforma detalını bilmir — nə endpoint, nə cavab forması.
 * Onları `platforms/<key>/service.ts` bilir; burada yalnız HƏR platforma üçün
 * eyni olan iş görülür:
 *   · az/ru → çincə tərcümə (axtarışdan əvvəl)
 *   · `(source, externalId)` üzrə dedup upsert
 *   · `CategoryProduct` əlaqə cədvəli ilə kateqoriya keşi (12 saat)
 *   · platformanın sırasının qorunması
 *
 * Yeni platforma əlavə etmək bu faylı DƏYİŞDİRMİR (qayda #6).
 */

export type SearchImportResult = {
  ok: boolean;
  /** Bazadakı məhsul ID-ləri — platformanın sıralaması qorunur. */
  productIds: string[];
  /** Platformanın bildirdiyi ümumi nəticə sayı. */
  total: number;
  /** Platformaya göndərilən son açar söz (tərcümədən sonra). */
  keyword: string;
  translated: boolean;
  message?: string;
};

export type CategoryImportResult = {
  ok: boolean;
  productIds: string[];
  total: number;
  message?: string;
  /** true — nəticə platformadan yox, öz bazamızdan gəldi. */
  cached?: boolean;
};

/** Kateqoriya keşinin təzəlik müddəti — bundan köhnədirsə yenidən çəkilir. */
const CATEGORY_TTL_MS = 12 * 60 * 60 * 1000;

const EMPTY = (keyword: string, message?: string): SearchImportResult => ({
  ok: false,
  productIds: [],
  total: 0,
  keyword,
  translated: false,
  message,
});

/* ----------------------- ortaq DB köməkçiləri ----------------------- */

/** Detalı ARTIQ çəkilmiş məhsullar (təsvir + şəkil siyahısı var). */
async function enrichedExternalIds(
  source: string,
  externalIds: string[],
): Promise<Set<string>> {
  if (externalIds.length === 0) return new Set();
  const rows = await prisma.product.findMany({
    where: { source, externalId: { in: externalIds } },
    select: { externalId: true, description: true, images: true },
  });
  const out = new Set<string>();
  for (const r of rows) {
    if (!r.externalId || !r.description) continue;
    try {
      if (Array.isArray(JSON.parse(r.images ?? "[]"))) out.add(r.externalId);
    } catch {
      /* zədəli JSON — zənginləşməmiş sayılır */
    }
  }
  return out;
}

/**
 * Eyni məhsulun RƏNG sətirlərini birləşdirir.
 *
 * Zara siyahıda hər rəngi AYRICA sətir kimi verir, `seoProductId` isə eynidir:
 * ölçdüm — bir kateqoriyada 11 sətir cəmi 3 məhsuldur (biri 6 rəngli).
 * Sadəcə upsert etsək sonuncu sətir əvvəlkiləri əzir və məhsul TƏK rənglə
 * qalır — kartda "6 rəng var" məlumatı itir.
 *
 * Ona görə yazmazdan əvvəl `(source, externalId)` üzrə qruplaşdırılır:
 * birinci sətir əsas götürülür, `attributes.colorThumbs` isə HAMISINDAN
 * yığılır (rəng `id`-si üzrə təkrarsız).
 */
function mergeColorRows(products: ProductWriteData[]): ProductWriteData[] {
  const byKey = new Map<string, ProductWriteData>();

  for (const data of products) {
    if (!data.externalId) continue;
    const key = `${data.source}:${data.externalId}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, data);
      continue;
    }

    const attrsOf = (d: ProductWriteData) =>
      (d.attributes ?? {}) as Record<string, unknown>;
    const thumbsOf = (d: ProductWriteData) => {
      const t = attrsOf(d).colorThumbs;
      return Array.isArray(t) ? (t as Record<string, unknown>[]) : [];
    };

    const merged = [...thumbsOf(existing)];
    const seen = new Set(merged.map((c) => String(c.id ?? c.name ?? "")));
    for (const c of thumbsOf(data)) {
      const id = String(c.id ?? c.name ?? "");
      if (seen.has(id)) continue;
      seen.add(id);
      merged.push(c);
    }

    byKey.set(key, {
      ...existing,
      attributes: { ...attrsOf(existing), colorThumbs: merged },
    } as ProductWriteData);
  }

  return [...byKey.values()];
}

/**
 * Payload-da VARİANT AĞACI (ölçü + SKU) varmı?
 *
 * Axtarış/kateqoriya cavabı ilə məhsul detalı (PDP) cavabı eyni deyil: birində
 * yalnız rənglər və şəkillər olur, ikincisində `colors[].sizes[].sku`. Fərqi
 * bilmək lazımdır, çünki kasıb cavabla zəngin cavabın üstündən yazmaq olmaz.
 */
function hasVariantDetail(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const colors = (value as { colors?: unknown }).colors;
  if (Array.isArray(colors)) {
    for (const c of colors) {
      const sizes = (c as { sizes?: unknown })?.sizes;
      if (Array.isArray(sizes) && sizes.length > 0) return true;
    }
  }
  const variants = (value as { variants?: unknown }).variants;
  return Array.isArray(variants) && variants.length > 0;
}

/** Dedup upsert: eyni məhsul `(source, externalId)` üzrə YALNIZ BİR DƏFƏ yazılır. */
async function upsertProducts(products: ProductWriteData[]): Promise<void> {
  for (const data of mergeColorRows(products)) {
    if (!data.externalId) continue;

    // VARİANT AĞACI QORUNUR.
    //
    // Əvvəl `update: data` mövcud sətrin `raw`/`attributes`-ini BÜTÖV üzərinə
    // yazırdı. Axtarış cavabında ölçü-SKU ağacı olmadığı üçün, PDP-dən gələn
    // zəngin data növbəti axtarışda SİLİNİRDİ (ölçüldü: alışdan sonra məhsul
    // yenidən idxal olundu və `raw`-da SKU qalmadı).
    //
    // Nəticə yalnız göstərişi pozmurdu: alış job-u RƏNGƏ UYĞUN LİNKİ də
    // `raw`-dan götürür — o itəndə Zara default rəngi açır və səhv rəng
    // alına bilər. Ona görə kasıb cavab zəngin sətrin üstündən yazmır.
    const existing = await prisma.product.findUnique({
      where: {
        source_externalId: { source: data.source, externalId: data.externalId },
      },
      select: { raw: true, attributes: true },
    });

    const update: Record<string, unknown> = { ...data };
    if (existing) {
      if (hasVariantDetail(existing.raw) && !hasVariantDetail(data.raw)) {
        delete update.raw;
      }
      if (
        hasVariantDetail(existing.attributes) &&
        !hasVariantDetail(data.attributes)
      ) {
        delete update.attributes;
      }
    }

    await prisma.product.upsert({
      where: {
        source_externalId: { source: data.source, externalId: data.externalId },
      },
      create: data as never,
      update: update as never,
    });
  }
}

/** `externalId` sırasını bazadakı məhsul ID-lərinə çevirir (sıra qorunur). */
async function resolveIds(source: string, order: string[]): Promise<string[]> {
  if (order.length === 0) return [];
  const rows = await prisma.product.findMany({
    where: { source, externalId: { in: order } },
    select: { id: true, externalId: true },
  });
  const byExternal = new Map(rows.map((r) => [r.externalId!, r.id]));
  return order
    .map((externalId) => byExternal.get(externalId))
    .filter((id): id is string => Boolean(id));
}

/** Kateqoriya baxışının nəticəsini əlaqə cədvəlinə yazır (sıra ilə). */
async function linkCategoryProducts(
  platformKey: string,
  categoryId: string,
  productIds: string[],
  page: number,
  perPage: number,
): Promise<void> {
  const offset = (page - 1) * perPage;
  await Promise.all(
    productIds.map((productId, i) =>
      prisma.categoryProduct.upsert({
        where: {
          platformKey_categoryId_productId: { platformKey, categoryId, productId },
        },
        create: { platformKey, categoryId, productId, position: offset + i },
        update: { position: offset + i },
      }),
    ),
  );
}

/**
 * Eyni kateqoriya + eyni səhifə əvvəl çəkilibsə, ID-ləri BAZADAN qaytarır.
 * Şərt: səhifə tam doludur və data TTL daxilindədir. Əks halda `null` →
 * çağıran platformaya gedir (sizin dediyiniz axın: əvvəl baza, sonra realtime).
 */
async function cachedCategoryPage(
  platformKey: string,
  categoryId: string,
  page: number,
  perPage: number,
): Promise<string[] | null> {
  const rows = await prisma.categoryProduct.findMany({
    where: { platformKey, categoryId },
    select: { productId: true, updatedAt: true },
    orderBy: { position: "asc" },
    take: perPage,
    skip: (page - 1) * perPage,
  });

  if (rows.length < perPage) return null;

  const newest = Math.max(...rows.map((r) => r.updatedAt.getTime()));
  if (Date.now() - newest > CATEGORY_TTL_MS) return null;

  return rows.map((r) => r.productId);
}

/* ------------------------------ AXTARIŞ ------------------------------ */

export async function importPartzonaSearch(opts: {
  query: string;
  lang: Lang;
  /** Platform.key — reyestrdə olan istənilən platforma (1688 / taobao / ...). */
  platform: string;
  page?: number;
  perPage?: number;
}): Promise<SearchImportResult> {
  const query = opts.query.trim();
  if (!query) return EMPTY(query);

  const service = getPlatformService(opts.platform);
  if (!service) {
    return EMPTY(query, `"${opts.platform}" üçün inteqrasiya yoxdur`);
  }

  // Sorğu PLATFORMANIN dilinə çevrilir (1688/Taobao → çincə, Zara → ispanca).
  // Hədəf dili servis özü elan edir, ona görə burada platforma adı keçmir.
  const { keyword, translated } = await translateQuery(
    query,
    opts.lang,
    service.searchLang,
  );

  const res = await service.search({
    keyword,
    translated,
    lang: opts.lang,
    page: opts.page ?? 1,
    perPage: opts.perPage ?? 20,
  });

  if (!res.ok) return { ...EMPTY(keyword, res.message), translated };

  await upsertProducts(res.products);
  const productIds = await resolveIds(service.key, res.order);

  // Yeni məhsulların adları FONDA az/ru-ya tərcümə olunur — cavabı gözlətmir,
  // artıq tərcüməli olanları ötür (qayda #5: istifadəçi öz dilində ad görsün).
  translateProductsInBackground(productIds);

  return { ok: true, productIds, total: res.total, keyword, translated };
}

/* -------------------------- KATEQORİYA BAXIŞI -------------------------- */

/**
 * Bölmənin ALT kateqoriyalarından məhsul yığır (səhifə dolmayanda).
 *
 * Bahalı əməliyyatdır (hər uşaq üçün ayrıca sorğu), ona görə:
 *  · yalnız çatışmayan qədər yığılır,
 *  · uşaq sayı məhdudlaşdırılır,
 *  · dublikatlar `seen` ilə atılır.
 * Nəticə `CategoryProduct`-a yazıldığı üçün növbəti dəfə birbaşa bazadan gəlir.
 */
const MAX_CHILDREN_TO_SCAN = 6;

async function fillFromChildren(
  service: NonNullable<ReturnType<typeof getPlatformService>>,
  parentId: string,
  lang: Lang,
  needed: number,
  seen: Set<string>,
): Promise<string[]> {
  if (needed <= 0) return [];

  const children = await prisma.platformCategory.findMany({
    where: { platformKey: service.key, parentExternalId: parentId },
    orderBy: { sortOrder: "asc" },
    take: MAX_CHILDREN_TO_SCAN,
  });
  if (children.length === 0) return [];

  const out: string[] = [];
  for (const child of children) {
    if (out.length >= needed) break;
    try {
      const res = await service.categoryProducts({
        category: {
          externalId: child.externalId,
          poolType: child.poolType ?? null,
          nameZh: child.nameZh ?? null,
          nameEn: child.nameEn ?? null,
        },
        lang,
        page: 1,
        perPage: needed - out.length,
        alreadyEnriched: (ids) => enrichedExternalIds(service.key, ids),
      });
      if (!res.ok) continue;
      await upsertProducts(res.products);
      for (const id of await resolveIds(service.key, res.order)) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= needed) break;
      }
    } catch {
      // Bir uşaq alınmasa qalanları davam edir — bölmə tamam boş qalmasın.
    }
  }
  return out;
}

/**
 * YARPAQ kateqoriyanı QARDAŞ kateqoriyalardan tamamlayır.
 *
 * `fillFromChildren` yalnız uşağı olan (konteyner) bölmələr üçün işləyir.
 * Amma yarpaq da az ola bilər: ölçdüm — Zara-nın
 * `HOMBRE > COLLABS > BENITO ANTONIO > COLECCIÓN > JERSÉIS` bölməsi cəmi
 * 11 sətir verir və onlar eyni 3 məhsulun rəngləridir. Belə səhifə demək olar
 * boş görünür.
 *
 * DİQQƏT — bu, DAİMİ deyil, TAMAMLAYICIDIR: kateqoriyanın ÖZ məhsulları
 * həmişə əvvəldə qalır, qardaşlardan gələnlər yalnız qalan yeri doldurur.
 * Ona görə istifadəçi əvvəlcə axtardığını görür.
 */
async function fillFromSiblings(
  service: NonNullable<ReturnType<typeof getPlatformService>>,
  categoryId: string,
  lang: Lang,
  needed: number,
  seen: Set<string>,
): Promise<string[]> {
  if (needed <= 0) return [];

  const self = await prisma.platformCategory.findFirst({
    where: { platformKey: service.key, externalId: categoryId },
    select: { parentExternalId: true },
  });
  if (!self?.parentExternalId) return [];

  const siblings = await prisma.platformCategory.findMany({
    where: {
      platformKey: service.key,
      parentExternalId: self.parentExternalId,
      externalId: { not: categoryId },
    },
    orderBy: { sortOrder: "asc" },
    take: MAX_CHILDREN_TO_SCAN,
  });
  if (siblings.length === 0) return [];

  const out: string[] = [];
  for (const sib of siblings) {
    if (out.length >= needed) break;
    try {
      const res = await service.categoryProducts({
        category: {
          externalId: sib.externalId,
          poolType: sib.poolType ?? null,
          nameZh: sib.nameZh ?? null,
          nameEn: sib.nameEn ?? null,
        },
        lang,
        page: 1,
        perPage: needed - out.length,
        alreadyEnriched: (ids) => enrichedExternalIds(service.key, ids),
      });
      if (!res.ok) continue;
      await upsertProducts(res.products);
      for (const id of await resolveIds(service.key, res.order)) {
        if (seen.has(id)) continue;
        seen.add(id);
        out.push(id);
        if (out.length >= needed) break;
      }
    } catch {
      // Bir qardaş alınmasa qalanları davam edir.
    }
  }
  return out;
}

export async function importPartzonaCategory(opts: {
  categoryId: string;
  platform: string;
  lang: Lang;
  page?: number;
  perPage?: number;
}): Promise<CategoryImportResult> {
  const categoryId = String(opts.categoryId).trim();
  if (!categoryId) return { ok: false, productIds: [], total: 0 };

  const service = getPlatformService(opts.platform);
  if (!service) {
    return {
      ok: false,
      productIds: [],
      total: 0,
      message: `"${opts.platform}" üçün inteqrasiya yoxdur`,
    };
  }

  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? 20;

  // 1) ÖNCƏ BAZA — eyni kateqoriya + eyni səhifə varsa platformaya getmirik.
  const cached = await cachedCategoryPage(service.key, categoryId, page, perPage);
  if (cached) {
    return { ok: true, productIds: cached, total: cached.length, cached: true };
  }

  // 2) Kateqoriya məlumatı DB-dən — hovuz tipi/çincə ad servisə lazımdır.
  //    (Taobao-da kateqoriya ağacı yoxdur; sətir tapılmasa da axın sınmır.)
  const row = await prisma.platformCategory.findUnique({
    where: {
      platformKey_externalId: { platformKey: service.key, externalId: categoryId },
    },
    select: { poolType: true, nameZh: true, nameEn: true },
  });

  const category: CategoryInfo = {
    externalId: categoryId,
    poolType: row?.poolType ?? null,
    nameZh: row?.nameZh ?? null,
    nameEn: row?.nameEn ?? null,
  };

  // 3) Realtime — platforma servisi öz üsulu ilə gətirir (hovuz və ya axtarış).
  const res = await service.categoryProducts({
    category,
    lang: opts.lang,
    page,
    perPage,
    alreadyEnriched: (ids) => enrichedExternalIds(service.key, ids),
  });

  if (!res.ok) {
    return { ok: false, productIds: [], total: 0, message: res.message };
  }

  await upsertProducts(res.products);
  let productIds = await resolveIds(service.key, res.order);

  // 3b) BÖLMƏ (konteyner) kateqoriyası — platformalar bölmənin özünə az məhsul
  //     verir, əsl mal alt kateqoriyalardadır. Məs. Zara-da "Qadın" cəmi 11
  //     məhsul qaytarır, altındakı "Ətirlər" isə 140. Səhifə dolmayıbsa
  //     uşaqlardan da yığırıq ki, istifadəçi boş bölmə görməsin.
  if (productIds.length < perPage) {
    const seen = new Set(productIds);
    const extra = await fillFromChildren(
      service,
      categoryId,
      opts.lang,
      perPage - productIds.length,
      seen,
    );
    productIds = [...productIds, ...extra];

    // 3c) Uşağı olmayan YARPAQ kateqoriya hələ də azdırsa — qardaşlardan
    //     tamamlanır. Öz məhsulları əvvəldə qalır (bax: `fillFromSiblings`).
    if (productIds.length < perPage) {
      const fromSiblings = await fillFromSiblings(
        service,
        categoryId,
        opts.lang,
        perPage - productIds.length,
        seen,
      );
      productIds = [...productIds, ...fromSiblings];
    }
  }

  // 4) Keşi yaz — məhsulun ÖZ `sourceCategoryId`-si toxunulmaz qalır.
  if (productIds.length > 0) {
    await linkCategoryProducts(service.key, categoryId, productIds, page, perPage);
  }

  // Yeni məhsulların adları fonda az/ru-ya tərcümə olunur (axtarışdakı kimi).
  translateProductsInBackground(productIds);

  return { ok: productIds.length > 0, productIds, total: res.total, message: res.message };
}

/** Kateqoriya üçün DB-dəki məhsullar (canlı sorğu alınmayanda fallback). */
export async function dbCategoryProductIds(
  categoryId: string,
  opts?: { take?: number; skip?: number; platform?: string },
): Promise<string[]> {
  const rows = await prisma.categoryProduct.findMany({
    where: {
      categoryId,
      ...(opts?.platform ? { platformKey: opts.platform } : {}),
    },
    select: { productId: true },
    orderBy: { position: "asc" },
    take: opts?.take ?? 20,
    skip: opts?.skip ?? 0,
  });
  if (rows.length > 0) return rows.map((r) => r.productId);

  // Əlaqə cədvəli boşdursa, məhsulun öz kateqoriyasına görə axtar.
  const fallback = await prisma.product.findMany({
    where: { isActive: true, sourceCategoryId: categoryId },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
    take: opts?.take ?? 20,
    skip: opts?.skip ?? 0,
  });
  return fallback.map((r) => r.id);
}

/* ------------------------------ ENDİRİM ------------------------------ */

/**
 * Platformanın ÖZ endirim bölməsindən məhsullar (`/sale` səhifəsi üçün).
 *
 * Platforma belə bölmə elan etməyibsə (`saleCategoryIds` yoxdur) `null`
 * qaytarır — çağıran DB-dəki endirimli məhsullara düşür. Beləliklə səhifədə
 * platforma adı keçmir: yeni platforma yalnız `saleCategoryIds` təyin edir.
 */
export async function importPlatformSale(opts: {
  platform: string;
  lang: Lang;
  perPage?: number;
}): Promise<string[] | null> {
  const service = getPlatformService(opts.platform);
  if (!service?.saleCategoryIds?.length) return null;

  const perPage = opts.perPage ?? 40;
  const ids: string[] = [];

  for (const categoryId of service.saleCategoryIds) {
    const res = await importPartzonaCategory({
      categoryId,
      platform: opts.platform,
      lang: opts.lang,
      page: 1,
      perPage,
    });
    for (const id of res.productIds) {
      if (!ids.includes(id)) ids.push(id);
    }
  }

  return ids.length > 0 ? ids : null;
}
