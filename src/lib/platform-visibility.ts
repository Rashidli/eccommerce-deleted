/**
 * PLATFORMA GÖRÜNÜRLÜYÜ — hansı platformalar saytda və admin panelində görünür.
 *
 * AĞ SİYAHIDIR (qara siyahı deyil): yalnız burada sadalanan açarlar görünür,
 * qalan HAMISI gizlidir. Səbəb — DB-yə yeni `Platform` sətri əlavə olunanda
 * (import, seed, admin) qara siyahı onu avtomatik buraxardı; ağ siyahı isə
 * susmaqla gizlədir. Yəni yeni platforma yalnız BİLƏRƏKDƏN açılır.
 *
 * Gizli platforma bu səthlərin heç birində görünmür: storefront platforma
 * zolağı, filtrlər, məhsul siyahıları, axtarış, kateqoriya ağacı, sitemap və
 * admin panelinin platforma/kateqoriya/tarif/valyuta səhifələri.
 *
 * İNTEQRASİYA KODU SİLİNMİR. `src/lib/partzona/platforms/<key>/` altındakı
 * servis, normalize və endpoint faylları, həmçinin servis reyestri
 * (`platforms/index.ts`) toxunulmamış qalır. Bu, kod silmək deyil — yalnız
 * GÖRÜNÜŞÜN bağlanmasıdır.
 *
 * Yenidən açmaq: açarı aşağıdakı siyahıya əlavə et, DB-də
 * `Platform.isActive = true` qoy və build al. Başqa heç nə lazım deyil.
 */
export const ENABLED_PLATFORMS: readonly string[] = ["1688"];

/**
 * PLATFORMA UI-ı MÜŞTƏRİYƏ GÖRÜNSÜNMÜ.
 *
 * `false` → alıcı platforma anlayışını ÜMUMİYYƏTLƏ görmür:
 *   · axtarış barında platforma seçicisi (çip/tab) yoxdur;
 *   · ana səhifədə "Bütün platformalar" bölməsi yoxdur;
 *   · məhsul kartında platforma nişanı (badge) yoxdur.
 *
 * ARXA PLAN DƏYİŞMİR: axtarış, kateqoriya baxışı və import yenə
 * `ENABLED_PLATFORMS` (1688) üzərindən işləyir — sadəcə mağaza tək brend kimi
 * görünür, aqreqator kimi yox.
 *
 * Bu, `ENABLED_PLATFORMS`-dan AYRI qərardır: ora "hansı platforma işləyir"
 * sualına cavab verir, bu isə "alıcı bunu görürmü" sualına. Sabah ikinci
 * platforma açılsa, seçicini geri qaytarmaq üçün burada `true` yazmaq kifayətdir.
 */
export const SHOW_PLATFORM_UI = false;

/** Platforma göstərilmədikdə istifadə olunan defolt açar. */
export const DEFAULT_PLATFORM = ENABLED_PLATFORMS[0] ?? "1688";

/**
 * Kateqoriya baxışı ünvanı.
 *
 * Platforma UI-ı gizlidirsə `platform=` parametri ÜNVANA YAZILMIR — tək
 * platforma onsuz da defoltdur (`products/page.tsx` onu özü seçir), ünvan
 * sətrində tədarükçünün adını göstərməyin isə mənası yoxdur.
 */
export function categoryHref(platformKey: string, categoryId: string): string {
  const cat = encodeURIComponent(categoryId);
  return SHOW_PLATFORM_UI
    ? `/products?platform=${encodeURIComponent(platformKey)}&cat=${cat}`
    : `/products?cat=${cat}`;
}

/**
 * Verilmiş platforma açarı gizlədilibmi?
 *
 * `null`/boş MƏNBƏSİZ deməkdir (əl ilə admin panelindən əlavə edilmiş məhsul) —
 * o, platforma deyil, ona görə gizli də sayılmır. Bu ayrım vacibdir: əks halda
 * mənbəsiz məhsulların detal səhifəsi 404 verərdi.
 */
export function isPlatformDisabled(key?: string | null): boolean {
  if (key === null || key === undefined || key === "") return false;
  return !ENABLED_PLATFORMS.includes(key);
}

/** Prisma `where` fraqmenti — yalnız icazəli platformaların açarları. */
export function enabledPlatformKeyWhere(): { key: { in: string[] } } {
  return { key: { in: [...ENABLED_PLATFORMS] } };
}

/**
 * `Product.source` üzrə Prisma `where` fraqmenti.
 *
 * `AND` içində qaytarılır, çünki bəzi sorğularda (məs. `searchProducts`)
 * yuxarı səviyyədə artıq `OR` var — birbaşa `OR` yazsaq onu əzərdi.
 *
 * `source: null` ayrıca buraxılır: SQL-də `source IN (...)` NULL sətirlər üçün
 * NULL qaytarır, yəni əl ilə əlavə edilmiş məhsullar siyahıdan düşərdi.
 */
export function enabledSourceWhere(): {
  AND: Array<{ OR: Array<{ source: null } | { source: { in: string[] } }> }>;
} {
  return {
    AND: [
      {
        OR: [{ source: null }, { source: { in: [...ENABLED_PLATFORMS] } }],
      },
    ],
  };
}
