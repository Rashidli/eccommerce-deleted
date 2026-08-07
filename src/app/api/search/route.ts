import { NextResponse } from "next/server";
import { getLang } from "@/lib/server-lang";
import {
  getProducts,
  getProductsByIds,
  getDeals,
  getNewArrivals,
} from "@/lib/data/catalog";
import {
  importPartzonaSearch,
  importPartzonaCategory,
  dbCategoryProductIds,
  importPlatformSale,
} from "@/lib/partzona/search";
import { isPlatformDisabled } from "@/lib/platform-visibility";

// Sonsuz scroll üçün növbəti səhifə (qayda #2 — platformaya sorğu yalnız backend-dən).
//  - `q` varsa: Partzona-nın həmin səhifəsi çəkilir → DB-yə upsert → qaytarılır
//  - `q` yoxdursa: DB kataloqundan skip/take
export const PAGE_SIZE = 20;

/**
 * `/sale` üçün platformanın öz endirim bölməsindən çəkilən MAKSİMUM məhsul.
 * Siyahı deterministikdir (servis `saleCategoryIds` sırası sabitdir), ona görə
 * səhifələr onu sadəcə dilimləyir — mənbələri qarışdırmırıq ki, dublikat olmasın.
 */
const SALE_WINDOW = 100;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const platformParam = url.searchParams.get("platform") ?? "";
  const cat = (url.searchParams.get("cat") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  /** Hansı siyahı səhifəsi: sale | deals | new | brands (boşdursa kataloq). */
  const list = (url.searchParams.get("list") ?? "").trim();
  const brand = (url.searchParams.get("brand") ?? "").trim();

  // Səhifə nömrəsini məhdudlaşdırırıq — sonsuz sorğu axını olmasın.
  if (page > 25) {
    return NextResponse.json({ products: [], hasMore: false });
  }

  const lang = await getLang();
  // Gizlədilmiş platforma (`?platform=taobao`) əl ilə yazılsa belə CANLI sorğu
  // getmir — yoxsa bağlanmış platformanın məhsulları DB-yə import olunardı.
  const requested = isPlatformDisabled(platformParam) ? "" : platformParam;
  const platform = requested && requested !== "all" ? requested : "1688";

  if (query) {
    const live = await importPartzonaSearch({
      query,
      lang,
      platform,
      page,
      perPage: PAGE_SIZE,
    });
    const products = await getProductsByIds(live.productIds, lang);
    return NextResponse.json({
      products,
      hasMore: products.length >= PAGE_SIZE,
      total: live.total,
    });
  }

  // Kateqoriya baxışı — növbəti səhifə də platformadan çəkilib DB-yə yazılır.
  if (cat) {
    const live = await importPartzonaCategory({
      categoryId: cat,
      platform,
      lang,
      page,
      perPage: PAGE_SIZE,
    });

    const ids = live.productIds.length
      ? live.productIds
      : await dbCategoryProductIds(cat, {
          take: PAGE_SIZE,
          skip: (page - 1) * PAGE_SIZE,
        });

    const products = await getProductsByIds(ids, lang);
    return NextResponse.json({
      products,
      hasMore: products.length >= PAGE_SIZE,
      total: live.total,
    });
  }

  // Siyahı səhifələri (/sale, /deals, /new, /brands) — hamısı EYNİ PAGE_SIZE.
  const skip = (page - 1) * PAGE_SIZE;

  if (list === "sale") {
    // Platformanın öz endirim bölməsi varsa (Zara → REBAJAS) oradan;
    // yoxdursa DB-dəki endirimli məhsullara düşür (səhifə #1 ilə eyni məntiq).
    if (platformParam && platformParam !== "all") {
      const saleIds = await importPlatformSale({
        platform: platformParam,
        lang,
        perPage: SALE_WINDOW,
      });
      if (saleIds) {
        const slice = saleIds.slice(skip, skip + PAGE_SIZE);
        const products = await getProductsByIds(slice, lang);
        return NextResponse.json({
          products,
          hasMore: skip + PAGE_SIZE < saleIds.length,
        });
      }
    }
    const products = await getDeals(lang, PAGE_SIZE, platformParam, skip);
    return NextResponse.json({
      products,
      hasMore: products.length >= PAGE_SIZE,
    });
  }

  if (list === "deals") {
    const products = await getDeals(lang, PAGE_SIZE, platformParam, skip);
    return NextResponse.json({
      products,
      hasMore: products.length >= PAGE_SIZE,
    });
  }

  if (list === "new") {
    const products = await getNewArrivals(lang, PAGE_SIZE, skip);
    return NextResponse.json({
      products,
      hasMore: products.length >= PAGE_SIZE,
    });
  }

  // Default (və `list=brands`) — kataloq; brend filtri SERVERDƏ tətbiq olunur.
  const products = await getProducts({
    lang,
    platform: platformParam || undefined,
    brand: brand || undefined,
    skip,
    take: PAGE_SIZE,
  });
  return NextResponse.json({
    products,
    hasMore: products.length >= PAGE_SIZE,
  });
}
