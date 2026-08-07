/**
 * Şəkil yüklənənə qədər göstərilən yüngül "shimmer" placeholder.
 *
 * Məhsul şəkilləri Alibaba CDN-indən (Çin) gəlir və ilk açılışda gec gəlir —
 * bu müddətdə istifadəçi boş ağ yer əvəzinə yumşaq keçidli sürüşən zolaq görür.
 * SVG data URI kimi kodlaşdırılır, ona görə əlavə şəbəkə sorğusu YARATMIR.
 */
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#f1f0f3" offset="20%" />
      <stop stop-color="#e6e4ea" offset="50%" />
      <stop stop-color="#f1f0f3" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f1f0f3" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite" />
</svg>`;

// Node-da `Buffer`, brauzerdə `btoa` — komponent hər iki mühitdə render olunur.
const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

/** `next/image` üçün hazır `blurDataURL` dəyəri. */
export function shimmerDataUrl(w = 400, h = 400): string {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;
}

/** Bütün məhsul şəkilləri üçün ortaq placeholder (kvadrat kartlar). */
export const PRODUCT_BLUR = shimmerDataUrl(400, 400);
