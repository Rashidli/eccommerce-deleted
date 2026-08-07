import "server-only";

/**
 * ÇATDIRILMA — platformadan asılı olmayan DTO.
 *
 * Hər platformanın DAXİLİ çatdırılması ayrıca hesablanır və ayrıca saxlanılır,
 * çünki valyutaları FƏRQLİDİR (1688/Taobao → CNY, Zara → EUR). Bir sifarişdə
 * üç platforma ola bilər; onların məbləği HEÇ VAXT bir rəqəmə toplanmır.
 */

/** Çatdırılma hesablamasının mənbəyi — hesabatda dürüstlük üçün. */
export type ShippingBasis =
  /** Platformanın öz API-sindən real qiymət (Zara). */
  | "api"
  /** Platformanın verdiyi ÖLÇÜLƏN çəki × DB-dəki tarif (1688). */
  | "weight-rule"
  /** Yalnız DB tarifi — çəki məlum deyil (Taobao: render icazəsi yoxdur). */
  | "rule";

export type ShippingQuote = {
  platformKey: string;
  amountCents: number;
  /** Platformanın valyutası — sifarişin ümumi valyutası DEYİL. */
  currency: string;
  /** Seçilmiş üsulun kodu (Zara: home_standard / drop_point ...). */
  method?: string;
  /** İstifadəçiyə göstərilən üsul adı. */
  methodName?: string;
  etaDays?: string;
  basis: ShippingBasis;
  /** Ölçülən ümumi çəki (qram) — tarif əsaslı hesablamanın sübutu. */
  weightGrams?: number;
  /** Pulsuz çatdırılma tətbiq olunubsa səbəbi (istifadəçiyə göstərilir). */
  freeReason?: string;
  /** Platformanın xam cavabı — sonradan yoxlamaq üçün (qayda #6). */
  raw?: unknown;
  /**
   * Qiymət ALINMADI — platforma cavab vermədi və ya icazə yoxdur.
   * Səbət sınmır; istifadəçiyə "çatdırılma sonra dəqiqləşəcək" göstərilir.
   */
  unavailable?: boolean;
  message?: string;
};

/** Bir platformaya aid səbət sətri — servis yalnız bunları görür. */
export type ShippingLine = {
  externalId: string;
  /** Seçilmiş variantın SKU/spec ID-si (varsa) — çəki ondan götürülür. */
  skuId?: string;
  quantity: number;
  priceCents: number;
  /** Məhsulun `raw` sahəsi — platforma öz çəki/ölçü datasını oradan oxuyur. */
  raw?: unknown;
};

export type ShippingArgs = {
  lines: ShippingLine[];
  /** Həmin platformadakı məhsulların cəmi (sent, platformanın valyutasında). */
  subtotalCents: number;
  currency: string;
  /** Endirimli məhsul var — Zara-da pulsuz çatdırılma həddini ləğv edir. */
  hasDiscountedItems: boolean;
};
