"use client";

import { PageShell } from "@/components/page-shell";
import { ProductGrid } from "@/components/product-grid";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";

export default function WishlistPage() {
  const { t } = useLang();
  const { items } = useWishlist();

  return (
    <PageShell
      title={t.pages.wishlist}
      subtitle={`${items.length} ${t.pages.productsFound}`}
    >
      <ProductGrid products={items} />
    </PageShell>
  );
}
