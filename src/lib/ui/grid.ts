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
/**
 * Sayt `container-fluid`-ə keçdi (en 100%), ona görə geniş ekranlar üçün iki
 * pillə əlavə olundu: 1280px-dən 6, 1536px-dən 7 sütun. Əks halda 2560px
 * monitorda 5 sütun kartları ~500px enə dartardı — məhsul kartı yox, afişa.
 */
export const PRODUCT_GRID_CLASS =
  "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7";

/**
 * Skelet kartlarının sayı.
 *
 * Sütun sayı artıq 2-dən 7-yə qədər dəyişir, ona görə HƏR breakpoint-də sətri
 * tam dolduran vahid ədəd yoxdur. 14 seçildi: ən dar (2) və ən geniş (7)
 * hallarda sətir tam dolur, aralıqda son sətir yarımçıq qalır — yüklənmə
 * skeletində bu gözə dəymir.
 */
export const PRODUCT_GRID_SKELETON_COUNT = 14;

/**
 * Kart şəkilləri üçün `sizes` — yuxarıdakı sütun sayı ilə UYĞUN olmalıdır.
 *
 * NİYƏ VACİBDİR: `next/image`-də `fill` işlədib `sizes` verməsən, default
 * `100vw` sayılır və brauzer ən böyük variantı (bizdə 1920px) endirir.
 * Ölçdüm: ana səhifədə 139, axtarışda 46 şəkil məhz belə 1920px gəlirdi —
 * halbuki kart cəmi ~250px enindədir. Yəni hər şəkil onlarla dəfə artıq
 * bayt idi və server hər biri üçün nəhəng variant hazırlayırdı.
 *
 * Faizlər sütun sayından çıxır: 2 → 50vw, 3 → 33vw, 4 → 25vw, 5 → 20vw,
 * 6 → 17vw, 7 → 14vw. Yuxarıdakı `PRODUCT_GRID_CLASS` dəyişəndə BU DA
 * dəyişməlidir — əks halda brauzer yenə lazımından böyük variant endirir.
 */
export const PRODUCT_IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, (max-width: 1536px) 17vw, 14vw";
