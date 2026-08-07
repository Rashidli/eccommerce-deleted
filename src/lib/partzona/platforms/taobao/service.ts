import "server-only";
import { searchTaobao, lookupTaobaoProduct } from "../../endpoints";
import { isPermissionError, PartzonaError } from "../../client";
import {
  extractTaobaoSearch,
  normalizeTaobaoProduct,
  extractTaobaoDetail,
  normalizeTaobaoDetail,
  type RawTaobaoDetail,
} from "./normalize";
import { mapSafe, safePatch } from "../normalize-guard";
import { getPlatformCurrency } from "@/lib/currency/config";
import type { ShippingArgs, ShippingQuote } from "@/lib/shipping/types";
import { quoteFromRule } from "@/lib/shipping/rule";
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

// TAOBAO SERVİSİ — 1688-dən struktur olaraq fərqlənən hər şey burada qapalıdır:
//   · səhifələmə parametrləri `page_no` / `page_size` (maks 20, 1688-də 50)
//   · detal endpoint-i `/taobao/products/lookup?item_id=` (1688-də `/products/{id}`)
//   · KATEQORİYA AĞACI YOXDUR — Partzona Taobao üçün `/categories` vermir,
//     ona görə kateqoriya baxışı kateqoriyanın çincə adı ilə axtarışdır.

const SOURCE = "taobao";
/** Partzona `page_size` üçün maksimum 20 qəbul edir (validasiya səviyyəsində). */
const MAX_PAGE_SIZE = 20;

async function fetchDetail(
  itemId: string,
  lang: Lang,
): Promise<RawTaobaoDetail | null> {
  try {
    return extractTaobaoDetail(
      await lookupTaobaoProduct({ item_id: itemId, language: lang }),
    );
  } catch (error) {
    if (isPermissionError(error) || error instanceof PartzonaError) return null;
    throw error;
  }
}

export const serviceTaobao: PlatformService = {
  key: SOURCE,
  searchLang: "zh",

  async search({ keyword, lang, page, perPage }: SearchArgs) {
    if (!keyword) return EMPTY_RESULT("açar söz boşdur");

    try {
      const res = await searchTaobao({
        keyword,
        page_no: page,
        page_size: Math.min(perPage, MAX_PAGE_SIZE),
        language: lang === "az" ? "en" : lang,
      });

      const { items, total } = extractTaobaoSearch(res);
      // Zədəli element bütün paketi sındırmır — atlanır (normalize sərhədi).
      const { products } = mapSafe(items, normalizeTaobaoProduct, (await getPlatformCurrency(SOURCE)) ?? undefined);

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
  }: CategoryArgs): Promise<PlatformFetchResult> {
    // Taobao-da kateqoriya hovuzu endpoint-i yoxdur → çincə ad ilə axtarış.
    const keyword = category.nameZh || category.nameEn || "";
    if (!keyword) return EMPTY_RESULT("kateqoriyanın axtarış adı yoxdur");
    return this.search({ keyword, translated: true, lang, page, perPage });
  },

  async productDetail({ externalId, lang }): Promise<ProductPatch | null> {
    return safePatch(await fetchDetail(externalId, lang), normalizeTaobaoDetail);
  },

  /**
   * Taobao daxili çatdırılması.
   *
   * DOĞRU mənbə `POST /taobao/orders/render`-dir — spesifikasiyaya görə
   * "qiymət, shipping və mövcudluq yoxlanılır" (preview, sifariş YARATMIR).
   * Lakin partnyor tokenimizdə bu endpoint üçün icazə YOXDUR:
   *   HTTP 403 "You do not have permission for this endpoint (/taobao/orders/render)"
   * İcazə veriləndən sonra bu metod render-ə keçirilməlidir; hazırda məhsul
   * cavabında çəki də olmadığı üçün yalnız DB tarifi işlədilir (`basis: rule`).
   */
  async shippingQuote(args: ShippingArgs): Promise<ShippingQuote> {
    // Taobao cavabında çəki sahəsi yoxdur (yalnız `shippingOrigin`), ona görə
    // ölçülən çəki ötürülmür — tarifin ehtiyat çəkisi işləyir.
    return quoteFromRule(SOURCE, args, null);
  },
};
