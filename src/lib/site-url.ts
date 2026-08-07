/**
 * Saytın PUBLIC ünvanı.
 *
 * Niyə lazımdır: tətbiq nginx arxasında 127.0.0.1:3100-də işləyir, ona görə
 * `request.url` daxili ünvanı qaytarır. Ondan yönləndirmə qursaq, istifadəçi
 * `https://localhost:3100/...` ünvanına düşür (ödənişdən sonra bu baş verirdi).
 *
 * `x-forwarded-host` başlığına ETİBAR ETMİRİK — onu kənar adam saxtalaşdıra
 * bilər və istifadəçini öz saytına yönləndirə bilər (host header injection).
 * Ona görə domen konfiqurasiyadan gəlir.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://e-commerce.ini.az"
).replace(/\/+$/, "");

/** Nisbi yolu tam public URL-ə çevirir. */
export function absoluteUrl(path: string): URL {
  return new URL(path.startsWith("/") ? path : `/${path}`, SITE_URL);
}
