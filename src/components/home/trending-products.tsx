"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Star, ShoppingCart } from "lucide-react";
import type { ProductDTO } from "@/lib/data/catalog";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import { SectionHeading } from "./section-heading";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export function TrendingProducts({ products }: { products: ProductDTO[] }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();
  const { t } = useLang();

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
        title={t.sections.trending}
        subtitle={t.hero.subtitle}
        href="/products"
        linkLabel={t.common.seeAll}
      />

      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              className="pl-3 sm:pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
            >
              <Link href={`/products/${product.id}`} className="block">
              <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-brand/40 hover:shadow-xl hover:-translate-y-1">
                {/* Image Container */}
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={product.img}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="h-full w-full object-contain rounded-md transition duration-500 group-hover:scale-110"
                  />

                  {/* Wishlist Button */}
                  <button
                    aria-label="Save to wishlist"
                    onClick={(e) => handleToggleWishlist(e, product)}
                    className={`absolute cursor-pointer right-2 top-2 grid h-8 w-8 place-items-center rounded-full shadow-md transition-all duration-300 hover:scale-110 ${
                      isInWishlist(product.id)
                        ? "bg-destructive text-white"
                        : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:bg-destructive hover:text-white"
                    }`}
                  >
                    <Heart className={`h-4 w-4 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
                  </button>

                  {/* Brand Badge — brend yoxdursa boş pill çıxmasın */}
                  {product.brand && (
                    <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-brand to-purple-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                      {product.brand}
                    </span>
                  )}

                  {/* Quick Add Button - always visible on mobile, hover on desktop */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300">
                    <button
                      onClick={(e) => handleAddToCart(e, product)}
                      className="w-full cursor-pointer flex items-center justify-center gap-1.5 bg-brand-ink/90 sm:bg-brand-ink text-white py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-brand transition-colors"
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {t.common.addToCart}
                    </button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="p-3 sm:p-4">
                  <p className="truncate text-sm font-semibold text-gray-800 group-hover:text-brand transition-colors">
                    {product.name}
                  </p>

                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground">({product.rating})</span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-lg font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                      {product.price}
                    </p>
                  </div>
                </div>
              </article>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 hidden md:flex" />
        <CarouselNext className="-right-4 hidden md:flex" />
      </Carousel>
    </section>
  );
}
