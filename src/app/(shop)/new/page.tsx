import { PageShell } from "@/components/page-shell";
import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { getNewArrivals } from "@/lib/data/catalog";

/** İlk səhifə — `/api/search`-dəki PAGE_SIZE ilə EYNİ olmalıdır. */
const PAGE_SIZE = 20;

// Yeni gələnlər — DB-dən (ən son əlavə olunanlar), sonsuz scroll ilə.
export default async function NewPage() {
  const lang = await getLang();
  const t = dict[lang];
  const products = await getNewArrivals(lang, PAGE_SIZE);
  return (
    <PageShell title={t.pages.new}>
      <InfiniteProductGrid initial={products} params={{ list: "new" }} />
    </PageShell>
  );
}
