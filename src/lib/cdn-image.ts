/**
 * PLATFORMA CDN-İNİN ÖZ ÖLÇÜLƏNDİRMƏSİ.
 *
 * PROBLEM (ölçülmüş): 1688/Taobao şəkilləri Çindəki Alibaba CDN-indədir və
 * ORİJİNAL fayl 100–460 KB-dır. `next/image` onları optimizasiya edərkən
 * serverimiz əvvəl bütöv faylı Çindən endirir, sonra sharp ilə kodlayır —
 * bir şəklin İLK optimizasiyası **14.9 saniyə** çəkirdi. Siyahı səhifəsində
 * 20-40 belə şəkil var və hamısı eyni Node prosesində növbəyə düşür.
 *
 * HƏLL: Alibaba CDN-i fayl adının sonuna `_800x800q75.jpg` yazmaqla kiçik
 * variant verir (75 KB, 0.2 s). Biz URL-i bazadan oxuyanda məhz bu variantı
 * götürürük — `next/image` artıq NƏHƏNG yox, KİÇİK fayl endirir.
 *
 * NİYƏ BİRBAŞA BRAUZERƏ VERMİRİK: Alibaba CDN hotlink-i bloklayır. Yoxlandı —
 * `Referer: https://e-commerce.ini.az/` ilə sorğu **403** qaytarır, Referer-siz
 * isə 200. Yəni şəkli birbaşa <img src> ilə vermək olmaz (custom loader ilə
 * bir dəfə sınadım, brauzerdə bütün 1688/Taobao şəkilləri qaraldı).
 * Serverimiz Referer göndərmədiyi üçün proxy rolu MƏCBURİDİR.
 *
 * Zara (`static.zara.net`) hotlink-ə icazə verir və Avropadadır, ona görə
 * ona toxunmuruq — `?ts=` imzasını dəyişmək onsuz da 403 verir.
 */

/** CDN-in öz ölçüləndirməsini dəstəkləyən hostlar. */
const ALIBABA_HOST = /(^|\.)(alicdn\.com|taobaocdn\.com)$/i;

/** `_WxH` şəkilçisi artıq varsa təkrar əlavə etmirik. */
const ALREADY_SIZED = /_\d+x\d+(q\d+)?\.(jpg|jpeg|png|webp)$/i;

/**
 * Alibaba CDN İXTİYARİ ölçü qəbul etmir — ağ siyahısı var.
 * Canlı yoxlanılıb: 100/200/300/400/500/600/640/800/960/1080/1200 → 200,
 * amma 750/828/1000/1500/1920 → **404** (şəkil ümumiyyətlə açılmır).
 */
const ALIBABA_WIDTHS = [100, 200, 300, 400, 600, 800, 960, 1200] as const;

/** Siyahı kartları üçün mənbə eni — 5 sütunlu şəbəkədə kart ~250px-dir. */
export const CARD_SOURCE_WIDTH = 600;

/** Məhsul qalereyası üçün mənbə eni — əsas şəkil böyük göstərilir. */
export const GALLERY_SOURCE_WIDTH = 1200;

function nearestWidth(width: number): number {
  return ALIBABA_WIDTHS.find((w) => w >= width) ?? ALIBABA_WIDTHS.at(-1)!;
}

/**
 * URL-i CDN-in kiçildilmiş variantına çevirir.
 * Tanınmayan host və ya artıq ölçülü URL — olduğu kimi qaytarılır.
 */
export function cdnImage(url: string, width = CARD_SOURCE_WIDTH): string {
  if (!url) return url;

  // Protokolsuz URL (`//img.alicdn.com/...`) bazada rast gəlinir.
  const absolute = url.startsWith("//") ? `https:${url}` : url;
  if (!/^https?:\/\//i.test(absolute)) return url;

  let host: string;
  let pathname: string;
  try {
    const u = new URL(absolute);
    host = u.hostname;
    pathname = u.pathname;
  } catch {
    return url;
  }

  if (!ALIBABA_HOST.test(host) || ALREADY_SIZED.test(pathname)) return absolute;

  const w = nearestWidth(width);
  return `${absolute}_${w}x${w}q75.jpg`;
}
