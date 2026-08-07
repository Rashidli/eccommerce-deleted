/**
 * PLATFORMA GÖRÜNÜRLÜYÜ — hansı platformalar saytda və admin panelində görünür.
 *
 * Burada sadalanan açarlar HƏR YERDƏN gizlədilir: storefront platforma zolağı,
 * filtrlər, məhsul siyahıları, axtarış, kateqoriya ağacı, sitemap və admin
 * panelinin platforma/kateqoriya/tarif səhifələri.
 *
 * İNTEQRASİYA KODU SİLİNMİR. `src/lib/partzona/platforms/<key>/` altındakı
 * servis, normalize və endpoint faylları toxunulmamış qalır; servis reyestri
 * (`platforms/index.ts`) də dəyişmir. Yəni bu, kod silmək deyil — yalnız
 * GÖRÜNÜŞÜN bağlanmasıdır.
 *
 * Yenidən açmaq: açarı aşağıdakı siyahıdan çıxar, `Platform.isActive`-i DB-də
 * `true` et və build al. Başqa heç nə lazım deyil.
 *
 * Qeyd: DB-dəki `Platform.isActive` bayrağı da paralel olaraq `false`-dur.
 * İkisi birlikdə işləyir — bu siyahı kod tərəfli qorumadır (admin panelindən
 * səhvən açılsa belə platforma görünmür), `isActive` isə data tərəflidir.
 */
export const DISABLED_PLATFORMS: readonly string[] = ["taobao", "zara"];

/** Verilmiş platforma açarı gizlədilibmi? */
export function isPlatformDisabled(key?: string | null): boolean {
  return typeof key === "string" && DISABLED_PLATFORMS.includes(key);
}

/** Siyahıdan gizli platformaları atır (admin və UI siyahıları üçün). */
export function withoutDisabledPlatforms<T extends { key: string }>(rows: T[]): T[] {
  return rows.filter((r) => !isPlatformDisabled(r.key));
}

/**
 * `Product.source` üzrə Prisma `where` fraqmenti.
 *
 * `AND` içində qaytarılır, çünki bəzi sorğularda (məs. `searchProducts`)
 * yuxarı səviyyədə artıq `OR` var — birbaşa `OR` yazsaq onu əzərdi.
 *
 * `source: null` ayrıca buraxılır: SQL-də `source NOT IN (...)` NULL sətirlər
 * üçün NULL qaytarır, yəni əl ilə əlavə edilmiş (mənbəsiz) məhsullar da
 * siyahıdan düşərdi.
 */
export function enabledSourceWhere(): {
  AND?: Array<{ OR: Array<{ source: null } | { source: { notIn: string[] } }> }>;
} {
  if (DISABLED_PLATFORMS.length === 0) return {};
  return {
    AND: [
      {
        OR: [
          { source: null },
          { source: { notIn: [...DISABLED_PLATFORMS] } },
        ],
      },
    ],
  };
}
