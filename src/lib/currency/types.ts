/**
 * VALYUTA ÇEVİRMƏ — ortaq tiplər.
 *
 * Bu qat YALNIZ GÖSTƏRİŞ üçündür. Sifariş, çatdırılma və ödəniş məbləğləri
 * həmişə platformanın ÖZ valyutasında saxlanılır (`OrderTotal`,
 * `OrderShipping`, `Payment`) — çevrilmiş rəqəm heç vaxt bazaya yazılmır və
 * heç vaxt müştəridən tutulan məbləğ olmur.
 *
 * Bu fayl `server-only` DEYİL: client komponentlər də çevrilmiş nəticəni
 * göstərmək üçün tipləri işlədir (hesablama isə serverdə olur).
 */

/** Bir çevirmənin nəticəsi. */
export type ConvertedAmount = {
  /** Çevrilmiş məbləğ (sent). Çevirmə baş tutmayıbsa orijinal məbləğ. */
  cents: number;
  /** Nəticənin valyutası. Çevirmə olmayıbsa mənbə valyutası. */
  currency: string;
  /**
   * false — məzənnə tapılmadı və ya çevirmə söndürülüb.
   * Belə halda UI orijinal valyutanı göstərir; TƏXMİN EDİLMİR.
   */
  isConverted: boolean;
  /** Tətbiq olunmuş məzənnə (marja daxil) — audit/şəffaflıq üçün. */
  rate?: number;
  /** Orijinal məbləğ və valyuta — UI "≈" işarəsi ilə göstərə bilsin. */
  sourceCents: number;
  sourceCurrency: string;
};

/** Mağazanın valyuta ayarı — bazadakı tək sətir. */
export type CurrencyConfig = {
  /** null → çevirmə yoxdur, hər məhsul öz valyutasında görünür. */
  displayCurrency: string | null;
  /** Marja, bazis punktu (250 = %2.5). */
  markupBps: number;
  /** base → quote → məzənnə. */
  rates: Record<string, Record<string, number>>;
};

/** Boş konfiqurasiya — məzənnə yoxdursa çevirmə etmirik. */
export const EMPTY_CURRENCY_CONFIG: CurrencyConfig = {
  displayCurrency: null,
  markupBps: 0,
  rates: {},
};
