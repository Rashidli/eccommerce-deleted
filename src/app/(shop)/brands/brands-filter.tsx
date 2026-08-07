"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { InfiniteProductGrid } from "@/components/infinite-product-grid";
import { useLang } from "@/context/lang-context";
import type { ProductDTO } from "@/lib/data/catalog";

/**
 * Brend seçimi URL-dədir (`?brand=`) — süzgəc SERVERDƏ işləyir.
 *
 * Əvvəl bütün kataloq (2000+ məhsul) client-ə göndərilib burada süzülürdü;
 * paginasiya ilə birlikdə bu işləməzdi, çünki yalnız yüklənmiş 20 sətir
 * süzülərdi və istifadəçi brendin qalan məhsullarını heç vaxt görməzdi.
 */
export function BrandsFilter({
  products,
  brands,
  selected,
}: {
  products: ProductDTO[];
  brands: string[];
  selected: string | null;
}) {
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();

  const pick = (brand: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (brand) params.set("brand", brand);
    else params.delete("brand");
    const qs = params.toString();
    router.push(qs ? `/brands?${qs}` : "/brands");
  };

  return (
    <PageShell title={t.pages.brands}>
      {/* Brend filtrləri — mobildə tək sətir, yana sürüşür; masaüstündə sətirlərə bölünür */}
      <div className="-mx-4 mb-5 overflow-x-auto scrollbar-hide md:mx-0 md:mb-6 md:overflow-visible">
        <div className="flex flex-nowrap gap-2 px-4 md:flex-wrap md:px-0">
          <FilterChip
            active={selected === null}
            onClick={() => pick(null)}
            label={t.filters.allBrands}
          />
          {brands.map((b) => (
            <FilterChip
              key={b}
              active={selected === b}
              onClick={() => pick(b)}
              label={b}
            />
          ))}
        </div>
      </div>

      <InfiniteProductGrid
        initial={products}
        params={{ list: "brands", brand: selected ?? undefined }}
      />
    </PageShell>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 ${
        active
          ? "bg-brand text-brand-foreground"
          : "bg-muted text-foreground/70 hover:bg-muted/70"
      }`}
    >
      {label}
    </button>
  );
}
