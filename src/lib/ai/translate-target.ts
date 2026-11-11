/**
 * HƏDƏF DİLİ tərifləri — `translate.ts`-dən AYRICA fayldadır.
 *
 * Səbəb sadədir: lüğət qatı (`query-terms.ts`) və sorğu həlli
 * (`query-resolve.ts`) `SearchLang` tipinə ehtiyac duyur, `translate.ts` isə
 * ONLARI çağırır. Hamısı bir faylda olsaydı dairəvi import yaranardı.
 *
 * Bu fayl `server-only` DEYİL — içində nə açar var, nə şəbəkə sorğusu; yalnız
 * tip və validasiya qaydaları. Beləcə tip lazım olan yerdə server qatını
 * dartıb gətirmək məcburiyyəti yoxdur.
 */

/** Platformanın axtarış dili — `PlatformService.searchLang` ilə eyni dəyərlər. */
export type SearchLang = "zh" | "es" | "en";

export const TARGET: Record<
  SearchLang,
  { name: string; marketplaces: string; validate: (t: string) => boolean }
> = {
  zh: {
    name: "Simplified Chinese",
    marketplaces: "Chinese marketplaces (1688, Taobao)",
    // Çincə cavabda heroqlif olmalıdır — model izahat qaytarıbsa atılır.
    // Latın hərfləri İCAZƏLİDİR: brend adı ("gucci 包") qəsdən saxlanılır,
    // çünki ölçüldü — brendi çincəyə çevirmək nəticəni azaldır və ya sıfırlayır.
    validate: (t) => /[一-鿿]/.test(t),
  },
  es: {
    name: "Spanish",
    marketplaces: "the Spanish Zara catalogue",
    // Latın əlifbası üçün heroqlif yoxlaması mənasızdır: cavab qısa olmalı
    // və izahat/cümlə kimi görünməməlidir.
    validate: (t) => t.length > 0 && t.length <= 60 && !/[.:;!?]/.test(t),
  },
  en: {
    name: "English",
    marketplaces: "an international catalogue",
    validate: (t) => t.length > 0 && t.length <= 60 && !/[.:;!?]/.test(t),
  },
};
