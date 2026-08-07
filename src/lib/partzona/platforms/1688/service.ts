import "server-only";
import {
  search1688,
  get1688Product,
  list1688CategoryProducts,
} from "../../endpoints";
import { isPermissionError, PartzonaError } from "../../client";
import {
  extract1688Search,
  normalize1688Product,
  extract1688CategoryOfferIds,
  extract1688Detail,
  normalize1688Detail,
  detailToCreatePayload,
  type Raw1688Detail,
} from "./normalize";
import { mapSafe, safePatch } from "../normalize-guard";
import { getPlatformCurrency } from "@/lib/currency/config";
import type { ShippingArgs, ShippingQuote } from "@/lib/shipping/types";
import { quoteFromRule } from "@/lib/shipping/rule";
import { weightGramsFor1688 } from "@/lib/shipping/weight";
import {
  EMPTY_RESULT,
  type CategoryArgs,
  type PlatformFetchResult,
  type PlatformService,
  type ProductPatch,
  type ProductWriteData,
  type SearchArgs,
} from "../types";
import type { Lang } from "@/lib/i18n";

// 1688 SERVİSİ — bütün 1688-ə xas bilik burada qapalıdır.
// Xüsusiyyət: `/categories/{id}/products` yalnız offerId siyahısı qaytarır,
// ona görə kateqoriya baxışında hər ID üçün ayrıca detal sorğusu atılır.

const SOURCE = "1688";

/** Xam detalı gətirir (icazə/şəbəkə xətasında null — axın dayanmasın). */
async function fetchDetail(
  offerId: string,
  lang: Lang,
): Promise<Raw1688Detail | null> {
  try {
    return extract1688Detail(await get1688Product(offerId, { lang, country: "en" }));
  } catch (error) {
    if (isPermissionError(error) || error instanceof PartzonaError) return null;
    throw error;
  }
}

export const service1688: PlatformService = {
  key: SOURCE,
  searchLang: "zh",

  async search({ keyword, translated, lang, page, perPage }: SearchArgs) {
    try {
      const res = await search1688({
        keyword,
        page,
        per_page: Math.min(perPage, 50),
        lang,
        // Açar sözü biz çincəyə çevirmişiksə, platforma təkrar tərcümə etməsin.
        keyword_translate: !translated,
      });

      const { items, total } = extract1688Search(res);
      // Zədəli element bütün paketi sındırmır — atlanır (normalize sərhədi).
      const { products } = mapSafe(items, normalize1688Product, (await getPlatformCurrency(SOURCE)) ?? undefined);

      return {
        ok: true,
        products,
        order: products.map((p) => p.externalId),
        total,
      };
    } catch (error) {
      if (isPermissionError(error)) {
        return EMPTY_RESULT("Partzona endpoint icazəsi yoxdur (403).");
      }
      if (error instanceof PartzonaError) {
        return EMPTY_RESULT(`Partzona xətası: ${error.message}`);
      }
      throw error;
    }
  },

  async categoryProducts({
    category,
    lang,
    page,
    perPage,
    alreadyEnriched,
  }: CategoryArgs): Promise<PlatformFetchResult> {
    // Offer hovuzu YALNIZ `poolType` təyin olunmuş kateqoriyalarda işləyir;
    // qalanlarda F0021 qaytarır. Belə hallarda kateqoriyanın çincə adı ilə
    // axtarış daha dəqiq nəticə verir (alt kateqoriyalar da bura düşür).
    if (!category.poolType) {
      const keyword = category.nameZh || category.nameEn || "";
      if (!keyword) return EMPTY_RESULT("kateqoriyanın axtarış adı yoxdur");
      return this.search({ keyword, translated: true, lang, page, perPage });
    }

    const type = category.poolType === "auto" ? "auto" : "retail";

    try {
      const res = await list1688CategoryProducts(category.externalId, {
        type,
        page,
        per_page: Math.min(perPage, 50),
        language: lang,
      });

      const { offerIds, total, error } = extract1688CategoryOfferIds(res);
      if (error) return EMPTY_RESULT(error);
      if (offerIds.length === 0) return { ok: true, products: [], order: [], total };

      // DB-də zəngin sətri olanlar üçün sorğu atmırıq (paylaşılan qat bilir).
      const known = await alreadyEnriched(offerIds);
      const missing = offerIds.filter((id) => !known.has(id));

      const products: ProductWriteData[] = [];
      const queue = [...missing];
      const workers = Math.min(5, queue.length || 1);

      await Promise.all(
        Array.from({ length: workers }, async () => {
          for (;;) {
            const offerId = queue.shift();
            if (!offerId) return;
            const detail = await fetchDetail(offerId, lang);
            if (!detail) continue;
            const { products: one } = mapSafe([detail], (d) => ({
              ...detailToCreatePayload(d),
              sourceCategoryId: category.externalId,
              sourcePoolType: type,
            }));
            products.push(...one);
          }
        }),
      );

      return { ok: true, products, order: offerIds, total };
    } catch (error) {
      if (isPermissionError(error)) {
        return EMPTY_RESULT("Partzona endpoint icazəsi yoxdur (403).");
      }
      if (error instanceof PartzonaError) {
        return EMPTY_RESULT(`Partzona xətası: ${error.message}`);
      }
      throw error;
    }
  },

  async productDetail({ externalId, lang }): Promise<ProductPatch | null> {
    return safePatch(await fetchDetail(externalId, lang), normalize1688Detail);
  },

  /**
   * 1688 daxili çatdırılması.
   *
   * Platforma `productShippingInfo`-da ÖLÇÜLƏN çəki/ölçü verir, amma QİYMƏT
   * VERMİR (bazadakı 486/1104 məhsulda yoxlanılıb). Ona görə real çəki DB-dəki
   * tarifə vurulur — ölçü platformadan, tarif bizdən (`basis: weight-rule`).
   */
  async shippingQuote(args: ShippingArgs): Promise<ShippingQuote> {
    let total: number | null = null;
    for (const line of args.lines) {
      const g = weightGramsFor1688(line.raw, line.skuId);
      if (g == null) continue;
      total = (total ?? 0) + g * line.quantity;
    }
    return quoteFromRule(SOURCE, args, total);
  },
};
