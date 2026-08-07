/**
 * MƏHSUL ŞƏBƏKƏSİ — sütun sayının TƏK mənbəyi.
 *
 * Əvvəl hər siyahı öz sinif sətrini daşıyırdı: ana səhifə 6, axtarış 4,
 * skelet 4 sütun idi — eyni saytda üç fərqli düzülüş. Müştəri masaüstündə
 * 5 sütun istədi, ona görə dəyər burada bir yerdə saxlanılır.
 *
 * Skelet də EYNİ sinfi işlətməlidir, əks halda yükləmə bitəndə düzülüş
 * sıçrayır.
 */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5";

/** Skelet kartlarının sayı — sətir tam dolsun deyə 5-in mislidir. */
export const PRODUCT_GRID_SKELETON_COUNT = 10;

/**
 * Kart şəkilləri üçün `sizes` — yuxarıdakı sütun sayı ilə UYĞUN olmalıdır.
 *
 * NİYƏ VACİBDİR: `next/image`-də `fill` işlədib `sizes` verməsən, default
 * `100vw` sayılır və brauzer ən böyük variantı (bizdə 1920px) endirir.
 * Ölçdüm: ana səhifədə 139, axtarışda 46 şəkil məhz belə 1920px gəlirdi —
 * halbuki kart cəmi ~250px enindədir. Yəni hər şəkil onlarla dəfə artıq
 * bayt idi və server hər biri üçün nəhəng variant hazırlayırdı.
 *
 * Faizlər sütun sayından çıxır: 2 sütun → 50vw, 3 → 33vw, 4 → 25vw, 5 → 20vw.
 */
export const PRODUCT_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw";
