import "server-only";
import type { Lang } from "@/lib/i18n";
import type { SearchLang } from "@/lib/ai/translate";
import type { ShippingArgs, ShippingQuote } from "@/lib/shipping/types";

/**
 * PLATFORMA SERVİSİ — hər platforma (1688, Taobao, ...) bu interfeysi öz
 * qovluğunda ayrıca implementasiya edir. Çağıran tərəf platformanı TANIMIR:
 * reyestrdən servisi götürür və NORMALIZE OLUNMUŞ data alır (qayda #6).
 *
 * Ortaq olan hər şey (DB upsert, `CategoryProduct` keşi, TTL-lər, dedup)
 * `search.ts` / `detail.ts` içində BİR DƏFƏ yazılır — servislərdə təkrarlanmır.
 */

/** `Product` cədvəlinə yazılacaq tam sətir (create/update eyni payload). */
export type ProductWriteData = {
  externalId: string;
  source: string;
  name: string;
  brand: string;
  priceCents: number;
  image: string;
  [k: string]: unknown;
};

/** Mövcud `Product` sətrini yeniləmək üçün qismən payload (detal sorğusu). */
export type ProductPatch = Record<string, unknown>;

/**
 * DB-də ARTIQ zənginləşdirilmiş məhsulları soruşmaq üçün geri-çağırış.
 * Servis buna baxıb lazımsız detal sorğularını atlayır; DB məntiqi isə
 * paylaşılan qatda qalır (servis Prisma tanımır).
 */
export type EnrichedLookup = (externalIds: string[]) => Promise<Set<string>>;

export type PlatformFetchResult = {
  ok: boolean;
  /** Bazaya yazılacaq məhsullar — yalnız bu çağırışda çəkilənlər. */
  products: ProductWriteData[];
  /** Platformanın qaytardığı SIRA (externalId üzrə) — göstərmə sırası budur. */
  order: string[];
  /** Platformanın bildirdiyi ümumi nəticə sayı. */
  total: number;
  message?: string;
};

/** Kateqoriya baxışı üçün lazım olan kateqoriya məlumatı (DB-dən gəlir). */
export type CategoryInfo = {
  externalId: string;
  poolType: string | null;
  nameZh: string | null;
  nameEn: string | null;
};

export type SearchArgs = {
  /** Platformaya göndəriləcək SON açar söz (tərcümə paylaşılan qatda olub). */
  keyword: string;
  /** true — açar söz artıq çincədir, platforma özü tərcümə etməsin. */
  translated: boolean;
  lang: Lang;
  page: number;
  perPage: number;
};

export type CategoryArgs = {
  category: CategoryInfo;
  lang: Lang;
  page: number;
  perPage: number;
  alreadyEnriched: EnrichedLookup;
};

export interface PlatformService {
  /** `Platform.key` və `Product.source` ilə eyni dəyər. */
  readonly key: string;
  /**
   * Platformanın DANIŞDIĞI dil — istifadəçi sorğusu axtarışdan əvvəl buna
   * çevrilir. Çin bazarları çincə, Zara ispanca qat-qat çox nəticə verir.
   * Yeni platforma yalnız bu dəyəri təyin edir; axtarış qatı dəyişmir.
   */
  readonly searchLang: SearchLang;
  /**
   * Platformanın ÖZ endirim bölməsinin kateqoriya ID-ləri (varsa).
   *
   * Zara-da endirim ayrıca bölmədir (REBAJAS) — `/sale` oradan qidalanır.
   * 1688/Taobao-da belə bölmə yoxdur; onlar bunu təyin etmir və `/sale`
   * köhnə qiyməti olan məhsullara düşür. Yeni platforma yalnız bu sahəni
   * doldurur — `/sale` səhifəsi dəyişmir (qayda #6).
   */
  readonly saleCategoryIds?: readonly string[];
  search(args: SearchArgs): Promise<PlatformFetchResult>;
  categoryProducts(args: CategoryArgs): Promise<PlatformFetchResult>;
  /** Tək məhsulun detalı → `Product` update payload-ı (tapılmasa null). */
  productDetail(args: { externalId: string; lang: Lang }): Promise<ProductPatch | null>;
  /**
   * Platformanın DAXİLİ çatdırılma haqqı (varsa).
   *
   * Zara bunu öz API-sindən real qiymətlə verir; 1688 yalnız ÇƏKİ verdiyi üçün
   * ölçülən çəki DB tarifinə vurulur; Taobao-nun `orders/render` preview-i
   * token icazəsi tələb edir. Təyin edilməyibsə çatdırılma hesablanmır —
   * səbət sınmır, sadəcə "sonra dəqiqləşəcək" göstərilir.
   */
  shippingQuote?(args: ShippingArgs): Promise<ShippingQuote>;
}

export const EMPTY_RESULT = (message?: string): PlatformFetchResult => ({
  ok: false,
  products: [],
  order: [],
  total: 0,
  message,
});
