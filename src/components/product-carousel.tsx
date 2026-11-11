"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart } from "lucide-react";
import type { ProductDTO } from "@/lib/data/catalog";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { SectionHeading } from "@/components/home/section-heading";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

/**
 * MƏHSUL KARUSELİ — başlıq + üfüqi sürüşən kart lenti.
 *
 * ORTAQ KOMPONENTDİR: kateqoriya lentləri də, "Yeni gələnlər" də bunu işlədir.
 * Əvvəl karusel yalnız `category-rows.tsx`-də vardı, "Yeni gələnlər" isə şaquli
 * grid idi — eyni səhifədə iki fərqli ritm. Kart dizaynı da təkrarlanırdı.
 *
 * `Carousel` (embla) masaüstündə ox düymələri, mobildə barmaqla sürüşdürmə
 * verir — ikisi üçün ayrı komponent saxlamağa ehtiyac yoxdur.
 */
export function ProductCarousel({
  title,
  href,
  linkLabel,
  products,
}: {
  title: string;
  href: string;
  linkLabel: string;
  products: ProductDTO[];
}) {
  if (products.length === 0) return null;

  return (
    <section>
      <SectionHeading title={title} href={href} linkLabel={linkLabel} />

      <Carousel
        // `align: start` — lent həmişə kartın kənarından başlasın.
        // `containScroll` sonda boş yer qalmasının qarşısını alır.
        opts={{ align: "start", containScroll: "trimSnaps", loop: false }}
      >
        <CarouselContent className="-ml-4">
          {products.map((product) => (
            <CarouselItem
              key={product.id}
              // Neçə kart görünür: mobil 2.2, planşet 3, masaüstü 4-5,
              // geniş ekran 6. Mobildə kəsr qəsdəndir — yarım kart
              // "davamı var" siqnalıdır, istifadəçi sürüşdürməyi anlayır.
              className="basis-[45%] pl-4 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6"
            >
              <ProductCard product={product} />
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Oxlar yalnız masaüstündə — mobildə barmaqla sürüşdürülür və
            düymələr kartların üstünü örtərdi.
            MÖVQE ƏVƏZLƏNİR: komponentin defoltu `-left-12/-right-12`-dir,
            yəni oxlar konteynerdən 48px KƏNARA çıxır və bütün səhifədə
            üfüqi scroll yaradırdı. İndi lentin İÇİNDƏ dayanırlar. */}
        <CarouselPrevious className="left-2 hidden bg-background/85 shadow-md backdrop-blur md:flex" />
        <CarouselNext className="right-2 hidden bg-background/85 shadow-md backdrop-blur md:flex" />
      </Carousel>
    </section>
  );
}

/** Lent kartı — şəkil, sevimlilər, səbət, qiymət. */
function ProductCard({ product }: { product: ProductDTO }) {
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();

  // Endirim faizi qiymət MƏTNLƏRİNDƏN hesablanır — DTO-da hazır faiz yoxdur.
  const discountPct = (): number => {
    if (!product.originalPrice) return 0;
    const p = parseFloat(product.price.replace(/[^0-9.]/g, ""));
    const o = parseFloat(product.originalPrice.replace(/[^0-9.]/g, ""));
    if (!o || o <= p) return 0;
    return Math.round((1 - p / o) * 100);
  };

  const payload = {
    id: product.id,
    name: product.name,
    priceCents: product.priceCents,
    currency: product.currency,
    brand: product.brand,
    img: product.img,
  };

  const pct = discountPct();

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          <Image
            src={product.img}
            alt={product.name}
            fill
            // Sütun sayı ilə UYĞUN olmalıdır — əks halda brauzer lazımından
            // böyük variant endirir və server onu boş yerə hazırlayır.
            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, (max-width: 1536px) 20vw, 17vw"
            className="object-cover object-center transition duration-500 group-hover:scale-105"
          />

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleItem({ ...payload, rating: product.rating });
            }}
            className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full transition-colors ${
              isInWishlist(product.id)
                ? "bg-destructive text-white"
                : "bg-card/90 text-muted-foreground hover:bg-destructive hover:text-white"
            }`}
          >
            <Heart
              className={`h-3.5 w-3.5 ${isInWishlist(product.id) ? "fill-current" : ""}`}
            />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              addItem(payload);
            }}
            className="absolute bottom-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-card shadow-lg transition-colors hover:bg-brand hover:text-brand-foreground"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>

          {pct > 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-white shadow">
              -{pct}%
            </span>
          )}
        </div>

        <div className="space-y-1 p-2.5">
          <h3 className="truncate text-sm font-medium text-brand-ink transition-colors group-hover:text-brand">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-1.5">
            <p className="text-sm font-bold text-brand-ink">{product.price}</p>
            {product.originalPrice && (
              <span className="text-[11px] text-muted-foreground line-through">
                {product.originalPrice}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
