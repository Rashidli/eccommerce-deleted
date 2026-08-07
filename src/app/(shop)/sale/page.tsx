import { PageShell } from "@/components/page-shell";
import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { getPlatform } from "@/lib/server-platform";
import { getDeals, getProductsByIds, type ProductDTO } from "@/lib/data/catalog";
import { importPlatformSale } from "@/lib/partzona/search";

/** İlk səhifə — `/api/search`-dəki PAGE_SIZE ilə EYNİ olmalıdır. */
const PAGE_SIZE = 20;
/** Platformanın endirim bölməsindən çəkilən pəncərə — API ilə eyni. */
const SALE_WINDOW = 100;

/**
 * Endirimlər.
 *
 * Platformanın ÖZ endirim bölməsi varsa (Zara → REBAJAS) oradan gəlir;
 * yoxdursa (1688/Taobao) köhnə qiyməti olan məhsullara düşür.
 * Səhifə heç bir platformanı adı ilə tanımır — mənbəni servis reyestri
 * `saleCategoryIds` ilə elan edir (qayda #6).
 */
export default async function SalePage({
  searchParams,
}: {
  // Next 16: `searchParams` Promise-dir.
  searchParams: Promise<{ platform?: string }>;
}) {
  const [{ platform: platformParam }, lang] = await Promise.all([
    searchParams,
    getLang(),
  ]);
  const t = dict[lang];

  // URL > cookie — məhsul səhifələri ilə eyni sıra.
  const platform = platformParam ?? (await getPlatform());

  let products: ProductDTO[] = [];

  if (platform && platform !== "all") {
    // Pəncərə API ilə eynidir ki, 2-ci səhifə eyni deterministik siyahını
    // dilimləsin — mənbələr qarışsa dublikat/atlama olardı.
    const saleIds = await importPlatformSale({
      platform,
      lang,
      perPage: SALE_WINDOW,
    });
    if (saleIds) {
      products = await getProductsByIds(saleIds.slice(0, PAGE_SIZE), lang);
    }
  }

  // Platformanın endirim bölməsi yoxdursa/boşdursa — DB-dəki endirimli məhsullar.
  if (products.length === 0) {
    products = await getDeals(lang, PAGE_SIZE, platform);
  }

  return (
    <PageShell title={t.pages.sale}>
      <InfiniteProductGrid
        initial={products}
        params={{ list: "sale", platform }}
      />
    </PageShell>
  );
}
