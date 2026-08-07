import { PageShell } from "@/components/page-shell";
import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { getDeals } from "@/lib/data/catalog";

/** İlk səhifə — `/api/search`-dəki PAGE_SIZE ilə EYNİ olmalıdır. */
const PAGE_SIZE = 20;

// Endirimli məhsullar — DB-dən (köhnə qiyməti olanlar), sonsuz scroll ilə.
export default async function DealsPage() {
  const lang = await getLang();
  const t = dict[lang];
  const products = await getDeals(lang, PAGE_SIZE);
  return (
    <PageShell title={t.pages.deals}>
      <InfiniteProductGrid initial={products} params={{ list: "deals" }} />
    </PageShell>
  );
}
