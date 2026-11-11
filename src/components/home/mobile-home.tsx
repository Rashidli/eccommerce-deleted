"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Star } from "lucide-react";
import { useLang } from "@/context/lang-context";
import type {
  ProductDTO,
  CampaignDTO,
  CategoryRowDTO,
} from "@/lib/data/catalog";

// Mobil ana ekran — tətbiq düzümü: promo karuseli və yana sürüşən məhsul
// lentləri. Bütün data DB-dən props ilə gəlir.
//
// KATEQORİYA DAİRƏLƏRİ BURADAN SİLİNDİ: eyni siyahı indi header-də story
// zolağı kimi durur (`header/category-bar.tsx`) və o, mobildə də görünür.
// İkisini saxlamaq ekranın yuxarısında eyni dairələri iki dəfə göstərərdi.
export function MobileHome({
  campaigns,
  trending,
  newArrivals,
  categoryRows = [],
}: {
  campaigns: CampaignDTO[];
  trending: ProductDTO[];
  newArrivals: ProductDTO[];
  /** Populyar kateqoriyalar — hərəsi öz lenti ilə. */
  categoryRows?: CategoryRowDTO[];
}) {
  const { t } = useLang();

  return (
    <div className="space-y-7 pb-6 md:hidden">
      <PromoCarousel campaigns={campaigns} />
      <ProductRail
        title={t.sections.trending}
        href="/products"
        products={trending}
      />
      {/* Populyar kateqoriyalar — masaüstündəki karuselin mobil qarşılığı.
          Burada embla yerinə mövcud `ProductRail` işlədilir: mobil ekranda
          barmaqla sürüşdürmə onsuz da native-dir, ox düymələri isə kartların
          üstünü örtərdi. */}
      {categoryRows.map((row) => (
        <ProductRail
          key={row.key}
          title={row.name}
          href={row.href}
          products={row.products}
          limit={20}
        />
      ))}
      <ProductRail
        title={t.sections.newArrivals}
        href="/new"
        products={newArrivals}
      />
    </div>
  );
}

function PromoCarousel({ campaigns }: { campaigns: CampaignDTO[] }) {
  return (
    <section className="-mx-4 overflow-x-auto scroll-px-4 snap-x snap-mandatory scrollbar-hide">
      <div className="flex gap-3 px-4">
        {campaigns.map((promo) => (
          <Link
            key={promo.key}
            href={promo.href}
            // Bir banner ekranı tam tutsun, növbətisi tamamilə kənarda qalsın:
            // sol doldurma 16px + aralıq 12px = 28px.
            className={`relative flex w-[calc(100vw-1.75rem)] shrink-0 snap-start items-center justify-between overflow-hidden rounded-2xl ${promo.tint} px-4 py-4 transition-transform active:scale-[0.98]`}
          >
            <span className="relative z-10 min-w-0">
              <span className="block truncate font-display text-base font-bold text-brand-ink">
                {promo.eyebrow}
              </span>
              <span className="mt-0.5 block truncate text-xs text-brand-ink/70">
                {promo.title}
              </span>
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold text-brand-ink backdrop-blur">
                {promo.cta}
                <ChevronRight className="h-3 w-3" />
              </span>
            </span>
            <Image
              src={promo.img}
              alt={promo.eyebrow}
              width={120}
              height={100}
              className="h-24 w-28 shrink-0 object-contain"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function ProductRail({
  title,
  href,
  products,
  /** Lentdə göstəriləcək maksimum kart — kateqoriya lentləri 20 verir. */
  limit = 10,
}: {
  title: string;
  href: string;
  products: ProductDTO[];
  limit?: number;
}) {
  const { t } = useLang();

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-brand-ink">{title}</h2>
        <Link
          href={href}
          className="flex items-center text-xs font-semibold text-brand"
        >
          {t.common.seeAll}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="-mx-4 overflow-x-auto scroll-px-4 snap-x snap-mandatory scrollbar-hide">
        <div className="flex gap-3 px-4">
          {products.slice(0, limit).map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.id}`}
              // İki kart tam yerləşsin, üçüncüsü isə ekrandan tamam kənarda qalsın:
              // sol doldurma 16px + 2 aralıq × 12px = 40px, qalanı ikiyə bölünür.
              className="w-[calc((100vw-2.5rem)/2)] shrink-0 snap-start transition-transform active:scale-95"
            >
              <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
                <Image
                  src={product.img}
                  alt={product.name}
                  fill
                  sizes="(max-width: 425px) 50vw, 175px"
                  className="object-contain"
                />
                {product.originalPrice && (
                  <span className="absolute left-1.5 top-1.5 rounded-md bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-white">
                    -{discountPct(product)}%
                  </span>
                )}
              </div>

              <p className="mt-1.5 truncate text-xs font-medium text-foreground">
                {product.name}
              </p>

              <div className="mt-0.5 flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                <span className="text-[10px] text-muted-foreground">
                  {product.rating}
                </span>
              </div>

              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-brand-ink">
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-[10px] text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function discountPct(product: ProductDTO) {
  const price = parseFloat(product.price.replace(/[^0-9.]/g, ""));
  const original = parseFloat(
    (product.originalPrice ?? "").replace(/[^0-9.]/g, ""),
  );
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}
