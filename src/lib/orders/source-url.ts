import "server-only";

/**
 * Məhsulun PLATFORMADAKI birbaşa linki.
 *
 * Operator sifarişi əl ilə alır — bu link onun yeganə iş alətidir, ona görə
 * sifariş sətrinə SNAPSHOT kimi yazılır: məhsul sonradan silinsə və ya
 * dəyişsə belə, operator hansı səhifədən alacağını itirmir.
 *
 * `Product.sourceUrl` boş ola bilər (axtarış cavabında həmişə gəlmir),
 * ona görə `source` + `externalId`-dən qurmaq üçün ehtiyat yol var.
 */
export function buildSourceUrl(
  source: string | null,
  externalId: string | null,
  stored: string | null,
): string | null {
  // Platformanın özünün verdiyi link həmişə üstündür.
  if (stored && stored.trim()) return stored.trim();
  if (!externalId) return null;

  const id = encodeURIComponent(externalId);
  switch (source) {
    case "1688":
      return `https://detail.1688.com/offer/${id}.html`;
    case "taobao":
      return `https://item.taobao.com/item.htm?id=${id}`;
    // Zara məhsullarında `sourceUrl` həmişə dolu gəlir (API `url` verir), ona
    // görə bura yalnız ehtiyat halıdır. Slug olmadan `-pXXXXXXXX.html` formatı
    // Zara-da düzgün məhsula yönləndirir.
    case "zara":
      return `https://www.zara.com/es/es/-p${id}.html`;
    default:
      // Naməlum platforma — uydurma link qurmaqdansa boş qaytarmaq düzgündür.
      return null;
  }
}
