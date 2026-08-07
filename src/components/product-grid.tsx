"use client";

import Image from "next/image";
import { PRODUCT_BLUR } from "@/lib/image-placeholder";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import type { ProductCardDTO as Product } from "@/lib/data/catalog";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";
import { PRODUCT_GRID_CLASS, PRODUCT_IMAGE_SIZES } from "@/lib/ui/grid";

// Təkrar istifadə olunan məhsul grid-i (New Arrivals kart üslubu ilə eyni).
export function ProductGrid({ products }: { products: Product[] }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { t } = useLang();

  // Endirim faizi XAM rəqəmlərdən hesablanır — mətn parse etmək valyutanı
  // itirirdi və "¥100" ilə "$100" eyni sayılırdı.
  const discountPct = (priceCents: number, oldCents?: number) => {
    if (!oldCents || oldCents <= priceCents) return 0;
    return Math.round((1 - priceCents / oldCents) * 100);
  };

  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">{t.pages.empty}</div>
    );
  }

  return (
    <div className={PRODUCT_GRID_CLASS}>
      {products.map((product) => (
        <Link
          key={product.id}
          href={`/products/${product.id}`}
          className="block group transition-transform active:scale-[0.97] md:active:scale-100"
        >
          {/* Mobildə çərçivəsiz tətbiq kartı, masaüstündə hover kölgəli veb kartı */}
          <div className="relative overflow-hidden rounded-xl md:rounded-2xl md:border md:border-border md:bg-card md:transition-shadow md:hover:shadow-lg">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted md:rounded-none">
              <Image
                src={product.img}
                alt={product.name}
                fill
                sizes={PRODUCT_IMAGE_SIZES}
                className="object-contain object-center p-2 transition duration-500 md:group-hover:scale-105"
            placeholder="blur"
            blurDataURL={PRODUCT_BLUR}
              />
              {/* Hover qradiyenti yalnız masaüstündə — toxunma cihazlarında "ilişib" qalır */}
              <div className="absolute inset-0 hidden bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:block md:group-hover:opacity-100" />

              <button
                onClick={(e) => {
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
                }}
                className={`absolute top-2 right-2 h-8 w-8 md:top-3 md:right-3 md:h-9 md:w-9 rounded-full flex items-center justify-center transition-transform active:scale-90 ${
                  isInWishlist(product.id)
                    ? "bg-destructive text-white"
                    : "bg-card/90 text-muted-foreground hover:bg-destructive hover:text-white"
                }`}
              >
                <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  addItem({
                    id: product.id,
                    name: product.name,
                    priceCents: product.priceCents,
                    currency: product.currency,
                    brand: product.brand,
                    img: product.img,
                  });
                }}
                className="absolute bottom-2 right-2 h-9 w-9 md:bottom-3 md:right-3 md:h-10 md:w-10 rounded-full bg-card flex items-center justify-center shadow-lg transition-transform active:scale-90 hover:bg-brand hover:text-brand-foreground"
              >
                <ShoppingCart className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              {/* Platforma nişanı — rəng DB-dəki `Platform.badgeBg/badgeFg`-dən
                  gəlir (qayda #4). Rəng təyin olunmayıbsa nişan göstərilmir,
                  çünki neytral boz nişan istifadəçiyə heç nə demir. */}
              {product.sourceBadgeBg && (
                <span
                  className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow md:left-3 md:top-3"
                  style={{
                    backgroundColor: product.sourceBadgeBg,
                    color: product.sourceBadgeFg || "#ffffff",
                  }}
                >
                  {product.sourceLabel || product.source}
                </span>
              )}

              {discountPct(product.priceCents, product.oldPriceCents) > 0 && (
                <div className="absolute bottom-2 left-2 md:bottom-3 md:left-3 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  -{discountPct(product.priceCents, product.oldPriceCents)}%
                </div>
              )}
            </div>

            <div className="pt-2 space-y-0.5 md:p-3 md:space-y-1">
              <p className="hidden text-[11px] text-muted-foreground uppercase tracking-wider md:block">
                {product.brand}
              </p>
              <h3 className="text-xs font-medium text-brand-ink truncate md:text-sm md:group-hover:text-brand md:transition-colors">
                {product.name}
              </h3>
              <div className="flex items-baseline gap-1.5 md:gap-2">
                <p className="text-sm font-bold text-brand-ink">
                  {formatMoney(product.priceCents, product.currency)}
                </p>
                {product.oldPriceCents != null && (
                  <span className="text-[10px] text-muted-foreground line-through md:text-xs">
                    {formatMoney(product.oldPriceCents, product.currency)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
