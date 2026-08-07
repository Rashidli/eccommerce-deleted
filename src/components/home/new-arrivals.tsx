"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import type { ProductDTO } from "@/lib/data/catalog";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import { SectionHeading } from "./section-heading";
import { PRODUCT_GRID_CLASS, PRODUCT_IMAGE_SIZES } from "@/lib/ui/grid";

export function NewArrivals({ products }: { products: ProductDTO[] }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { t } = useLang();

  // Endirim faizini qiymət mətnlərindən hesablayır ("$99.00" → 99)
  const discountPct = (price: string, original?: string) => {
    if (!original) return 0;
    const p = parseFloat(price.replace(/[^0-9.]/g, ""));
    const o = parseFloat(original.replace(/[^0-9.]/g, ""));
    if (!o || o <= p) return 0;
    return Math.round((1 - p / o) * 100);
  };

  const handleAddToCart = (e: React.MouseEvent, product: ProductDTO) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      currency: product.currency,
      brand: product.brand,
      img: product.img,
    });
  };

  const handleToggleWishlist = (e: React.MouseEvent, product: ProductDTO) => {
    e.preventDefault();
    toggleItem({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      currency: product.currency,
      brand: product.brand,
      img: product.img,
      rating: product.rating,
    });
  };

  return (
    <section>
      <SectionHeading
        title={t.sections.newArrivals}
        href="/new"
        linkLabel={t.common.seeAll}
      />

      {/* Sıx grid — çox məhsul birdən görünür (Trendyol üslubu) */}
      <div className={PRODUCT_GRID_CLASS}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.id}`}
            className="block group"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
              {/* Image Container */}
              <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                <Image
                  src={product.img}
                  alt={product.name}
                  fill
                  sizes={PRODUCT_IMAGE_SIZES}
                  className="object-cover object-center transition duration-500 group-hover:scale-105"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Wishlist */}
                <button
                  onClick={(e) => handleToggleWishlist(e, product)}
                  className={`absolute top-3 right-3 h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isInWishlist(product.id)
                      ? "bg-destructive text-white"
                      : "bg-card/90 text-muted-foreground hover:bg-destructive hover:text-white"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                </button>

                {/* Add Button */}
                <button
                  onClick={(e) => handleAddToCart(e, product)}
                  className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-card flex items-center justify-center shadow-lg transition-colors duration-300 hover:bg-brand hover:text-brand-foreground"
                >
                  <ShoppingCart className="h-5 w-5" />
                </button>

                {/* New Tag */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-sm text-[10px] font-bold text-brand-ink">
                  {t.nav.new}
                </div>

                {/* Endirim faizi */}
                {discountPct(product.price, product.originalPrice) > 0 && (
                  <div className="absolute bottom-3 left-3 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white shadow">
                    -{discountPct(product.price, product.originalPrice)}%
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 space-y-1">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  {product.brand}
                </p>
                <h3 className="text-sm font-medium text-brand-ink truncate group-hover:text-brand transition-colors">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-brand-ink">{product.price}</p>
                  {product.originalPrice && (
                    <span className="text-xs text-muted-foreground line-through">
                      {product.originalPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
