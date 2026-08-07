import { Suspense } from "react";
import { getLang } from "@/lib/server-lang";
import { getProducts, getBrands } from "@/lib/data/catalog";
import { BrandsFilter } from "./brands-filter";

/** İlk səhifə — `/api/search`-dəki PAGE_SIZE ilə EYNİ olmalıdır. */
const PAGE_SIZE = 20;

/**
 * Brendlər — DB-dən.
 *
 * Brend filtri SERVERDƏ tətbiq olunur (`?brand=`): əvvəl bütün kataloq
 * göndərilib client-də süzülürdü, ona görə paginasiya mümkün deyildi.
 */
export default async function BrandsPage({
  searchParams,
}: {
  // Next 16: `searchParams` Promise-dir.
  searchParams: Promise<{ brand?: string }>;
}) {
  const [{ brand }, lang] = await Promise.all([searchParams, getLang()]);
  const [products, brands] = await Promise.all([
    getProducts({ lang, take: PAGE_SIZE, brand: brand || undefined }),
    getBrands(),
  ]);
  return (
    // `BrandsFilter` `useSearchParams` işlədir — Next onu Suspense sərhədi
    // tələb edir (products səhifəsindəki eyni nümunə).
    <Suspense>
      <BrandsFilter
        products={products}
        brands={brands}
        selected={brand ?? null}
      />
    </Suspense>
  );
}
