"use client";

import type { CategoryRowDTO } from "@/lib/data/catalog";
import { useLang } from "@/context/lang-context";
import { ProductCarousel } from "@/components/product-carousel";

/**
 * POPULYAR KATEQORİYALAR — hər biri öz məhsul lenti ilə.
 *
 * Kateqoriyaları və sıranı `getPopularCategoryRows()` müəyyən edir (admin
 * seçimi + 1688 satış rəqəmləri); bu komponent yalnız düzülüşü verir.
 *
 * Karusel və kart dizaynı `ProductCarousel`-dədir — eyni lent "Yeni gələnlər"
 * bölməsində də işlədilir, ona görə burada təkrarlanmır.
 */
export function CategoryRows({ rows }: { rows: CategoryRowDTO[] }) {
  const { t } = useLang();

  if (rows.length === 0) return null;

  return (
    <div className="space-y-12">
      {rows.map((row) => (
        <ProductCarousel
          key={row.key}
          title={row.name}
          href={row.href}
          linkLabel={t.common.seeAll}
          products={row.products}
        />
      ))}
    </div>
  );
}
