"use client";

import type { ProductDTO } from "@/lib/data/catalog";
import { useLang } from "@/context/lang-context";
import { ProductCarousel } from "@/components/product-carousel";

/**
 * YENİ GƏLƏNLƏR.
 *
 * Əvvəl şaquli grid idi (`PRODUCT_GRID_CLASS`), yuxarıdakı kateqoriya lentləri
 * isə karusel — eyni səhifədə iki fərqli ritm və iki fərqli kart dizaynı vardı.
 * İndi ikisi də `ProductCarousel`-dir: səhifə qısalır və göz bir ritmə alışır.
 */
export function NewArrivals({ products }: { products: ProductDTO[] }) {
  const { t } = useLang();

  return (
    <ProductCarousel
      title={t.sections.newArrivals}
      href="/new"
      linkLabel={t.common.seeAll}
      products={products}
    />
  );
}
