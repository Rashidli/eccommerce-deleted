/**
 * Kateqoriya şəklinin MİNİATÜR yolunu qaytarır.
 *
 * `/categories/1688-10165.webp?v=123` → `/categories/1688-10165-thumb.webp?v=123`
 *
 * Miniatürlər `lib/images/category-image.ts`-də yaradılır. Bu fayl isə həm
 * server, həm klient tərəfdən çağırılır (mega-menyu klient komponentidir), ona
 * görə `server-only` DEYİL və heç bir node modulu import etmir.
 *
 * Yol tanınmayan formatdadırsa (kənar URL, başqa qovluq) olduğu kimi qaytarılır
 * — uydurma fayl adı düzəltmək 404 deməkdir.
 *
 * KEŞ SINDIRICISI SAXLANILIR: `?v=` sorğusu miniatürə də şamil olunur, əks
 * halda şəkil dəyişəndə böyük fayl yenilənib miniatür köhnə qalardı.
 */
export function categoryThumbSrc(image: string): string {
  if (!image) return "";

  const [file, query] = image.split("?");
  if (!file.startsWith("/categories/") || !file.endsWith(".webp")) return image;
  if (file.endsWith("-thumb.webp")) return image;

  const base = file.slice(0, -".webp".length);
  return `${base}-thumb.webp${query ? `?${query}` : ""}`;
}
