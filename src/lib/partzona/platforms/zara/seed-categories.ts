import "server-only";
import { prisma } from "@/lib/prisma";
import { zaraCategories } from "./endpoints";

// Zara-nın ÖZ kateqoriya ağacını API-dən çəkib DB-yə yazır (`platformKey='zara'`).
//
// PROBLEM: `/api/categories` Zara saytının BÜTÜN menyusunu qaytarır (~1859 node) —
// içində mağaza linkləri, "Karyera", "Hədiyyə Kartı", "Haqqında" kimi naviqasiya
// bəndləri də var. Sadəcə ilk 2 səviyyəni götürmək məhz o zibili gətirirdi.
//
// HƏLL: Zara-nın öz menyusunu təkrarlayırıq — seksiya → əsl məhsul kateqoriyası.
// Ayırd etmə qaydası (canlı data ilə doğrulanıb):
//   · `layout` = "*products-category-view" → məhsul səthi; qalan bütün layout-lar
//     (marketing / divider / store-locator / giftcard / help / newsletter / ...)
//     naviqasiyadır və ATILIR.
//   · KONTEYNER (məs. "COLECCIÓN", "NEW COLLECTION") — 2+ uşağı özü kateqoriyadır;
//     menyuda başlıq rolu oynayır, seçilə bilən kateqoriya deyil → içinə keçirik.
//   · ƏSL KATEQORİYA — "VER TODO" (hamısına bax) uşağı var, ya da məhsul yarpağıdır.
//     Zara menyusunda məhz bunlar klikləniləndir: VESTIDOS, CAMISETAS, ZAPATOS...
//   · "VER TODO" özü valideyni təkrarladığı üçün atılır.
//   · Ölçü/yaş süzgəcləri (TALLA S, "6 - 14 AÑOS", "140 CM") menyu bəndi deyil,
//     filtrdir → atılır.
//
// Adlar Zara-dan İSPANCA gəlir; olduğu kimi `nameEn`-ə yazılır və tərcümə
// addımında az/en/ru-ya çevrilir (adları özümüz uydurmuruq — qayda: "Zara-dakı kimi").

type ZaraCat = {
  id?: number | string;
  name?: string;
  layout?: string | null;
  sectionName?: string;
  hasProducts?: boolean;
  seo?: { keyword?: string; seoCategoryId?: number | string };
  subcategories?: (ZaraCat | null)[];
};

export type ZaraSeedResult = {
  ok: boolean;
  topLevel: number;
  subs: number;
  removed: number;
  message?: string;
};

/** Seksiya adları ispancadır — ingilis qarşılığı ikon seçimi/tərcümə üçün. */
const SECTION_EN: Record<string, string> = {
  WOMAN: "Women",
  MAN: "Men",
  KID: "Kids",
  BEAUTY: "Beauty",
  PREOWNED: "Pre-Owned",
  TRAVEL: "Travel",
  BAMO: "Benito Antonio",
};

const PRODUCT_LAYOUT = /products-category-view$/;
/** "Hamısına bax" — valideyn kateqoriyanın təkrarı. */
const SEE_ALL = /^(VER TODO|VIEW ALL|TODO)$/i;
/**
 * Menyu bəndi olmayan adlar. `DIVIDER_MENU_*` — menyudakı ayırıcı xətlərdir;
 * onların mövcudluğu API-nin taksonomiya yox, RENDER OLUNMUŞ MENYU qaytardığını
 * sübut edir. Qalanları sayt naviqasiyasıdır (mağazalar, karyera, hədiyyə kartı).
 * `layout` filtri bunları onsuz da tutur — bu siyahı əlavə zəmanətdir.
 */
const JUNK_NAME =
  /^(\+?\s*(LKS|PRDCTS?|SERVICIOS|SEGUNDA MANO|LOOKBOOK|LOOKS|EDITORIAL|INFO|ABOUT|THE GUIDES|TARJETA REGALO|TIENDAS|CAREERS|DESCARGAR APP|JOIN LIFE|NEWSLETTER|CONTACTO|AYUDA|PRENSA|EMPRESA|OFICINAS|TICKET REGALO|DESCUBRE)|-+|DIVIDER.*)$/i;
/** Konteyner başlıqları — kateqoriya deyil, qrup adıdır. */
const CONTAINER_NAME =
  /^(COLECCION|COLLECTION|NEW COLLECTION|NOVEDADES|REBAJAS|SALE|ZARA PRE-OWNED|BENITO ANTONIO|PARTES DE (ARRIBA|ABAJO))$/i;
/** Ölçü / yaş / boy süzgəcləri — menyu bəndi deyil. */
const REFINEMENT =
  /^(TALLA\b|DESDE\b|\d|.*\bANOS\b|.*\bMESES\b|.*\bCM\b|SELECTED FOR YOU|ULTIMAS TALLAS|SPECIAL PRICES)/i;
/** Endirim budağı — kateqoriya ağacını təkrarlayır, ayrıca səthimiz var. */
const SALE_GROUP = /^(REBAJAS|SALE|SPECIAL PRICES|DESDE)/i;

/**
 * Storefront-a çıxmayan seksiyalar:
 *   BAMO  — "Benito Antonio" marketinq kolaborasiyası, alış kateqoriyası deyil
 *   TRAVEL— "Travel Mode" redaksiya səhifəsi (məhsul kateqoriyası vermir)
 *   PREOWNED — Zara-nın ikinci əl saytı; ayrı axın, məhsul kateqoriyası yoxdur
 */
const SKIP_SECTIONS = new Set(["BAMO", "TRAVEL", "PREOWNED"]);

/** Diakritikasız BÖYÜK forma — ispanca adları müqayisə etmək üçün. */
function norm(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

function catId(c: ZaraCat): string {
  return String(c.id ?? "").trim();
}

function isProduct(c: ZaraCat): boolean {
  return PRODUCT_LAYOUT.test(c.layout ?? "");
}

function children(c: ZaraCat): ZaraCat[] {
  return (c.subcategories ?? []).filter(Boolean) as ZaraCat[];
}

function productChildren(c: ZaraCat): ZaraCat[] {
  return children(c).filter(isProduct);
}

function hasSeeAll(c: ZaraCat): boolean {
  return children(c).some((k) => SEE_ALL.test((k.name ?? "").trim()));
}

/** Menyuda göstərilə bilən addırmı (texniki/filtr adları atılır). */
function usableName(c: ZaraCat): boolean {
  const raw = (c.name ?? "").trim();
  if (!raw) return false;
  if (SEE_ALL.test(raw) || JUNK_NAME.test(raw)) return false;
  const n = norm(raw);
  return !CONTAINER_NAME.test(n) && !REFINEMENT.test(n);
}

/** Uşaqları özü kateqoriya olan qrup başlığı — seçilə bilən kateqoriya deyil. */
function isContainer(c: ZaraCat): boolean {
  return productChildren(c).filter(hasSeeAll).length >= 2;
}

/** Zara menyusunda klikləniləbilən əsl məhsul kateqoriyası. */
function isRealCategory(c: ZaraCat): boolean {
  if (!isProduct(c) || !usableName(c)) return false;
  if (isContainer(c)) return false;
  return hasSeeAll(c) || productChildren(c).length === 0;
}

/** Qrupun içindən əsl kateqoriyaları yığır (tapan kimi dayanır — filtrlərə enmir). */
function collect(node: ZaraCat, out: ZaraCat[], depth = 0): void {
  // Endirim budağı HƏR DƏRİNLİKDƏ atılır — o, bütün kateqoriya ağacını
  // təkrarlayır və seksiyaya yad bəndlər gətirir (Qadın menyusuna POLOS və s.).
  if (depth > 0 && SALE_GROUP.test(norm(node.name))) return;

  if (depth > 0 && isRealCategory(node)) {
    out.push(node);
    return;
  }
  for (const child of children(node)) collect(child, out, depth + 1);
}

/** Bir seksiyanın menyu kateqoriyaları — Zara-nın öz sırası qorunur. */
function sectionCategories(section: ZaraCat): ZaraCat[] {
  const groups = productChildren(section).filter(
    (g) => !SALE_GROUP.test(norm(g.name)),
  );

  const found: ZaraCat[] = [];
  for (const group of groups) collect(group, found);

  // Ad üzrə dedup — sənəd sırası qorunur (yaş qruplarında eyni kateqoriya
  // dəfələrlə təkrarlanır: NIÑA/NIÑO/BEBÉ altında eyni "CAMISETAS" və s.).
  const seen = new Set<string>();
  return found.filter((c) => {
    const key = norm(c.name);
    if (seen.has(key) || !catId(c)) return false;
    seen.add(key);
    return true;
  });
}

export async function seedZaraCategories(): Promise<ZaraSeedResult> {
  let res: unknown;
  try {
    res = await zaraCategories({ format: "tree" });
  } catch (error) {
    return {
      ok: false,
      topLevel: 0,
      subs: 0,
      removed: 0,
      message: `Zara kateqoriya API xətası: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const tops = (res as { data?: (ZaraCat | null)[] })?.data;
  if (!Array.isArray(tops) || tops.length === 0) {
    return { ok: false, topLevel: 0, subs: 0, removed: 0, message: "Zara ağacı boş gəldi" };
  }

  type Row = {
    externalId: string;
    parentExternalId: string;
    nameEn: string;
    isLeaf: boolean;
    sortOrder: number;
  };
  const rows: Row[] = [];

  let sectionSort = 0;
  for (const section of tops) {
    if (!section) continue;
    const secId = catId(section);
    if (!secId) continue;
    if (SKIP_SECTIONS.has(norm(section.sectionName))) continue;

    const cats = sectionCategories(section);
    // Məhsul kateqoriyası olmayan seksiya storefront-a çıxmır
    // (PRE-OWNED, TRAVEL MODE, BENITO ANTONIO — marketinq səthləridir).
    if (cats.length === 0) continue;

    const sectionKey = norm(section.sectionName);
    rows.push({
      externalId: secId,
      parentExternalId: "0",
      nameEn: SECTION_EN[sectionKey] || section.name || secId,
      isLeaf: false,
      sortOrder: sectionSort++,
    });

    let childSort = 0;
    for (const c of cats) {
      const id = catId(c);
      if (!id || id === secId) continue;
      rows.push({
        externalId: id,
        parentExternalId: secId,
        nameEn: (c.name ?? "").trim(),
        isLeaf: productChildren(c).length === 0,
        sortOrder: childSort++,
      });
    }
  }

  // Eyni id iki seksiyada görünə bilər — ilk (daha yuxarı) qalır.
  const seen = new Set<string>();
  const unique = rows.filter((r) =>
    seen.has(r.externalId) ? false : (seen.add(r.externalId), true),
  );

  let topLevel = 0;
  let subs = 0;
  for (const r of unique) {
    await prisma.platformCategory.upsert({
      where: {
        platformKey_externalId: { platformKey: "zara", externalId: r.externalId },
      },
      create: {
        platformKey: "zara",
        externalId: r.externalId,
        parentExternalId: r.parentExternalId,
        nameEn: r.nameEn,
        // Zara-nın orijinal (ispanca) adı — 1688/taobao-da `nameZh` orijinal dili
        // saxladığı kimi. Tərcümə addımı buradan oxuyur.
        nameZh: r.nameEn,
        isLeaf: r.isLeaf,
        poolType: null,
        derivedFrom: null, // Zara-nın ÖZ ağacı — kopyalanmayıb.
        sortOrder: r.sortOrder,
      },
      update: {
        parentExternalId: r.parentExternalId,
        nameEn: r.nameEn,
        nameZh: r.nameEn,
        isLeaf: r.isLeaf,
        sortOrder: r.sortOrder,
        derivedFrom: null,
      },
    });
    if (r.parentExternalId === "0") topLevel++;
    else subs++;
  }

  // Köhnə (naviqasiya zibili olan) sətirləri və onların məhsul əlaqələrini silirik.
  const keep = unique.map((r) => r.externalId);
  const stale = await prisma.platformCategory.findMany({
    where: { platformKey: "zara", externalId: { notIn: keep } },
    select: { externalId: true },
  });
  const staleIds = stale.map((s) => s.externalId);

  if (staleIds.length > 0) {
    await prisma.categoryProduct.deleteMany({
      where: { platformKey: "zara", categoryId: { in: staleIds } },
    });
    await prisma.platformCategory.deleteMany({
      where: { platformKey: "zara", externalId: { in: staleIds } },
    });
  }

  return { ok: true, topLevel, subs, removed: staleIds.length };
}

/** Görünmə bayraqları: YALNIZ əsl alış seksiyaları (naviqasiya zibili yoxdur). */
export async function setZaraVisibility(): Promise<{ nav: number; home: number }> {
  await prisma.platformCategory.updateMany({
    where: { platformKey: "zara" },
    data: { showInNav: false, showOnHome: false },
  });

  const tops = await prisma.platformCategory.findMany({
    where: { platformKey: "zara", parentExternalId: "0" },
    select: { externalId: true },
    orderBy: { sortOrder: "asc" },
  });
  const topIds = tops.map((t) => t.externalId);

  await prisma.platformCategory.updateMany({
    where: { platformKey: "zara", externalId: { in: topIds } },
    data: { showInNav: true, showOnHome: true },
  });

  // Ana səhifədə ~18 kart olsun deyə hər seksiyadan ilk alt kateqoriyalar da
  // əlavə olunur (nav zolağı yalnız seksiyalarla qalır — orada yer azdır).
  const homeNeeded = Math.max(0, 18 - topIds.length);
  if (homeNeeded > 0) {
    const subs = await prisma.platformCategory.findMany({
      where: { platformKey: "zara", parentExternalId: { in: topIds } },
      select: { externalId: true },
      orderBy: [{ parentExternalId: "asc" }, { sortOrder: "asc" }],
      take: homeNeeded,
    });
    await prisma.platformCategory.updateMany({
      where: {
        platformKey: "zara",
        externalId: { in: subs.map((s) => s.externalId) },
      },
      data: { showOnHome: true },
    });
  }

  const home = await prisma.platformCategory.count({
    where: { platformKey: "zara", showOnHome: true },
  });
  return { nav: topIds.length, home };
}

/** Zara platform sətri (yoxdursa yaradır). */
export async function ensureZaraPlatform(): Promise<void> {
  const existing = await prisma.platform.findUnique({ where: { key: "zara" } });
  if (existing) return;
  const count = await prisma.platform.count();
  await prisma.platform.create({
    data: {
      key: "zara",
      nameAz: "Zara",
      nameEn: "Zara",
      nameRu: "Zara",
      provider: "zara",
      apiPath: "/api",
      isActive: true,
      sortOrder: count,
    },
  });
}
