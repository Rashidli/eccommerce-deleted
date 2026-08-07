import "server-only";
import {
  zaraSearch,
  zaraCategoryProducts,
  zaraProductDetail,
  zaraShippingEstimate,
} from "./endpoints";
import { isZaraSoftError } from "./client";
import {
  extractZaraList,
  normalizeZaraListItem,
  extractZaraDetail,
  normalizeZaraDetail,
} from "./normalize";
import { mapSafe, safePatch } from "../normalize-guard";
import { getPlatformCurrency } from "@/lib/currency/config";
import type { ShippingArgs, ShippingQuote } from "@/lib/shipping/types";
import {
  EMPTY_RESULT,
  type CategoryArgs,
  type PlatformFetchResult,
  type PlatformService,
  type ProductPatch,
  type SearchArgs,
} from "../types";

// ZARA SERVİSİ — 1688/Taobao-dan fərqlər burada qapalıdır:
//   · Açar söz TƏRCÜMƏ OLUNMUR — Zara ingiliscə/ispanca axtarışı özü qəbul edir,
//     çincəyə çevirmək lazım deyil (paylaşılan qat çincə açar söz göndərsə də,
//     Zara `q`-nu olduğu kimi işlədir).
//   · KATEQORİYA AĞACI VAR — `/categories/{id}/products` real endpoint-dir,
//     Taobao kimi çincə-ad axtarışına ehtiyac yoxdur.
//   · Qiymət EUR, detalda variant matrisi rəng×ölçü (əsl hex + şəkil).

const SOURCE = "zara";

export const serviceZara: PlatformService = {
  key: SOURCE,
  searchLang: "es",

  /**
   * Zara-nın ÖZ endirim bölməsi (REBAJAS) — `/sale` buradan qidalanır.
   * `2418848` = qadın (canlı yoxlamada 611 məhsul), `2721407` = kişi
   * (mövsümdən asılı olaraq boş ola bilər — boş cavab axını sındırmır).
   * Bu kateqoriyalar `PlatformCategory`-də saxlanmır: endirim bölməsi bütün
   * kataloqu təkrar sadalayır və naviqasiya ağacını çirkləndirirdi.
   */
  saleCategoryIds: ["2418848", "2721407"],

  async search({ keyword, lang, page, perPage }: SearchArgs): Promise<PlatformFetchResult> {
    if (!keyword) return EMPTY_RESULT("açar söz boşdur");
    try {
      const res = await zaraSearch({ q: keyword, page, limit: perPage });
      const { items, total } = extractZaraList(res);
      const { products } = mapSafe(items, normalizeZaraListItem, (await getPlatformCurrency(SOURCE)) ?? undefined);
      return {
        ok: true,
        products,
        order: products.map((p) => p.externalId),
        total,
      };
    } catch (error) {
      if (isZaraSoftError(error)) return EMPTY_RESULT(`Zara xətası: ${(error as Error).message}`);
      throw error;
    }
  },

  async categoryProducts({
    category,
    page,
    perPage,
  }: CategoryArgs): Promise<PlatformFetchResult> {
    try {
      const res = await zaraCategoryProducts({
        id: category.externalId,
        page,
        limit: perPage,
      });
      const { items, total } = extractZaraList(res);
      const { products } = mapSafe(items, normalizeZaraListItem, (await getPlatformCurrency(SOURCE)) ?? undefined);
      return {
        ok: true,
        products,
        order: products.map((p) => p.externalId),
        total,
      };
    } catch (error) {
      if (isZaraSoftError(error)) return EMPTY_RESULT(`Zara xətası: ${(error as Error).message}`);
      throw error;
    }
  },

  async productDetail({ externalId }): Promise<ProductPatch | null> {
    try {
      const res = await zaraProductDetail({ seoProductId: externalId });
      return safePatch(extractZaraDetail(res), normalizeZaraDetail);
    } catch (error) {
      if (isZaraSoftError(error)) return null;
      throw error;
    }
  },

  /**
   * Zara-nın REAL çatdırılma qiyməti — `/shipping/estimate`.
   *
   * Pulsuz çatdırılma məntiqi (30 EUR hədd, endirimli məhsulda hədd işləmir)
   * Zara tərəfindədir; biz onu təkrarlamırıq, sadəcə cavabı normalize edirik.
   * Default üsul `home_standard` (evə çatdırılma) — istifadəçi "home
   * çatdırılması" istəyir; `store_pickup` həmişə pulsuzdur, amma mağazaya
   * getmək tələb edir, ona görə default seçilmir.
   */
  async shippingQuote(args: ShippingArgs): Promise<ShippingQuote> {
    const base: ShippingQuote = {
      platformKey: SOURCE,
      amountCents: 0,
      currency: args.currency,
      basis: "api",
    };

    try {
      const res = (await zaraShippingEstimate({
        // Zara `subtotal`-ı EUR-la (kəsrli) gözləyir, sent yox.
        subtotal: args.subtotalCents / 100,
        hasDiscountedItems: args.hasDiscountedItems,
      })) as ZaraEstimateResponse;

      const data = res?.data;
      const options = Array.isArray(data?.options) ? data.options : [];
      const picked =
        options.find((o) => o?.code === "home_standard") ?? options[0] ?? null;

      if (!picked) {
        return { ...base, unavailable: true, message: "no-options" };
      }

      const cost = Number(picked.cost);
      return {
        ...base,
        amountCents: Number.isFinite(cost) ? Math.round(cost * 100) : 0,
        currency: data?.currency || args.currency,
        method: picked.code,
        methodName: picked.name ?? picked.nameEn ?? undefined,
        etaDays: picked.deliveryDays ?? undefined,
        freeReason: picked.free ? (picked.reason ?? "free") : undefined,
        raw: data,
      };
    } catch (error) {
      // Zara canlı brauzer sessiyası ilə işləyir — vaxtaşırı cavab verməyə
      // bilər. Səbət sınmasın deyə "sonra dəqiqləşəcək" qaytarılır.
      if (isZaraSoftError(error)) {
        return { ...base, unavailable: true, message: "zara-unavailable" };
      }
      throw error;
    }
  },
};

/** `/shipping/estimate` cavabının bizə lazım olan hissəsi. */
type ZaraEstimateResponse = {
  data?: {
    currency?: string;
    options?: Array<{
      code?: string;
      name?: string;
      nameEn?: string;
      cost?: unknown;
      free?: boolean;
      reason?: string;
      deliveryDays?: string;
    }>;
  };
};
