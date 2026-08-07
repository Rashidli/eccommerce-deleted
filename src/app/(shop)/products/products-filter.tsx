"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Star, Heart, ShoppingCart, ChevronDown, X, Search } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import type { ProductDTO } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { PRODUCT_BLUR } from "@/lib/image-placeholder";
import { PRODUCT_GRID_CLASS, PRODUCT_IMAGE_SIZES } from "@/lib/ui/grid";

// Kateqoriya və brend siyahıları DB-dən props ilə gəlir (qayda #4).
// Aşağıdakılar yalnız daxili məntiq açarlarıdır — etiketlər i18n-dən gəlir.
const sortOptions = ["featured", "priceAsc", "priceDesc", "newest", "rating"] as const;

interface Option {
  value: string;
  label: string;
}

function FilterDropdown({
  value,
  options,
  onChange,
  displayValue,
}: {
  value: string;
  options: Option[];
  onChange: (val: string) => void;
  displayValue?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          value !== options[0].value
            ? "bg-brand text-white"
            : "bg-muted text-foreground/70"
        }`}
      >
        {displayValue || value}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-border bg-card py-1 shadow-lg">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  value === option.value
                    ? "bg-brand/10 text-brand font-medium"
                    : "text-foreground/80 hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Məhsullar DB-dən (server) props ilə gəlir; burada yalnız kateqoriya/brend/platforma filtri.
/**
 * Qiymət sürüşdürücüsü — sabit aralıq düymələri əvəzinə məhsulların REAL
 * qiymət diapazonu üzərində işləyir (qayda #4 — hardcoded aralıq yoxdur).
 */
function PriceSlider({
  label,
  min,
  max,
  value,
  currency,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  /** Siyahıdakı məhsulların valyutası — simvol ona görə seçilir. */
  currency: string;
  onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 100;

  return (
    <div>
      <h3 className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <input
        type="range"
        min={min}
        max={max}
        step={Math.max(1, Math.round((max - min) / 100))}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(to right, var(--color-brand, #7c3aed) ${pct}%, var(--color-border, #e5e7eb) ${pct}%)`,
        }}
      />
      <div className="mt-1.5 flex justify-between px-1 text-xs text-muted-foreground">
        <span>{formatMoney(min, currency)}</span>
        <span className="font-semibold text-brand">{formatMoney(value, currency)}</span>
      </div>
    </div>
  );
}

/**
 * Sərbəst məzmunlu filtr çipi (qiymət sürüşdürücüsü üçün).
 *
 * `FilterDropdown` siyahı üçündür; qiymət isə diapazondur, siyahıya sığmır.
 * Eyni çip görünüşü saxlanılır ki, filtr sırası vahid görünsün.
 */
function FilterPopover({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
          active ? "bg-brand text-white" : "bg-muted text-foreground/70"
        }`}
      >
        {label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export function ProductsFilter({
  products,
  categories,
  brands,
  subcategories = [],
}: {
  products: ProductDTO[];
  /** DB-dən: { key: slug, name: lokallaşdırılmış ad } */
  categories: { key: string; name: string }[];
  /** DB-dən: mövcud brendlər */
  brands: string[];
  /** Seçilmiş kateqoriyanın alt kateqoriyaları (DB-dən) — sol panel üçün. */
  subcategories?: { key: string; name: string; href: string }[];
}) {
  const { t } = useLang();
  const searchParams = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  // Sol paneldə hansı alt kateqoriyanın seçili göstəriləcəyi.
  const activeCat = searchParams.get("cat") || "";

  const catOpts: Option[] = [
    { value: "all", label: t.filters.allCategories },
    ...categories.map((c) => ({ value: c.key, label: c.name })),
  ];
  const brandOpts: Option[] = [
    { value: "all", label: t.filters.allBrands },
    ...brands.map((b) => ({ value: b, label: b })),
  ];
  const sortLabels = [
    t.filters.sortFeatured,
    t.filters.sortPriceLow,
    t.filters.sortPriceHigh,
    t.filters.sortNewest,
    t.filters.sortBestRating,
  ];
  const sortOpts: Option[] = sortOptions.map((v, i) => ({ value: v, label: sortLabels[i] }));

  /**
   * Defolt görünən alt kateqoriya sayı. 12 ≈ masaüstündə iki sətir —
   * seçim etmək üçün kifayət, səhifəni boğmur.
   */
  const SUBCATEGORY_PREVIEW = 12;
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);

  // Seçili kateqoriya siyahının sonunda olsa belə görünsün deyə əvvələ çəkilir.
  const orderedSubcategories = useMemo(() => {
    if (!activeCat) return subcategories;
    const i = subcategories.findIndex((s) => s.key === activeCat);
    if (i <= 0) return subcategories;
    const copy = [...subcategories];
    const [active] = copy.splice(i, 1);
    return [active, ...copy];
  }, [subcategories, activeCat]);

  const visibleSubcategories = showAllSubcategories
    ? orderedSubcategories
    : orderedSubcategories.slice(0, SUBCATEGORY_PREVIEW);
  const hiddenSubcategoryCount =
    orderedSubcategories.length - visibleSubcategories.length;

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  // Qiymət diapazonu məhsulların özündən hesablanır (hardcoded aralıq yoxdur).
  const priceBounds = useMemo(() => {
    const cents = products.map((p) => p.priceCents).filter((c) => c > 0);
    if (cents.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...cents), max: Math.max(...cents) };
  }, [products]);
  // Siyahıdakı məhsulların valyutası — qarışıq platformada ilk məhsulunki
  // götürülür (filtr yalnız göstəriş üçündür, hesablama sentlə gedir).
  const priceCurrency = products[0]?.currency ?? "USD";
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const priceCeiling = maxPrice ?? priceBounds.max;
  const [sortBy, setSortBy] = useState("featured");
  const { addItem } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();

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

  // Axtarış (q) və platforma filtri SERVERDƏ tətbiq olunur (dil-həssas, Product.source üzrə).
  // Burada yalnız client-side kateqoriya/brend süzgəci qalır — `q`-nu təkrar süzsək,
  // başqa dildə uyğun gələn nəticələr səhvən atılardı.
  /* ---------------------- Sonsuz scroll (pagination) ---------------------- */
  const PAGE_SIZE = 20;
  const platformParam = searchParams.get("platform") || "";
  const catParam = searchParams.get("cat") || "";
  const [extra, setExtra] = useState<ProductDTO[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(products.length >= PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Serverdən gələn ilk səhifə + scroll ilə yüklənənlər.
  const allProducts = useMemo(() => [...products, ...extra], [products, extra]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const params = new URLSearchParams({ page: String(next) });
      if (q) params.set("q", q);
      if (platformParam) params.set("platform", platformParam);
      if (catParam) params.set("cat", catParam);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data: { products?: ProductDTO[]; hasMore?: boolean } =
        await res.json();
      const incoming = data.products ?? [];

      setExtra((prev) => {
        // Eyni məhsul iki dəfə görünməsin (upsert olunduğu üçün təkrarlana bilər).
        const seen = new Set([...products, ...prev].map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setPage(next);
      setHasMore(Boolean(data.hasMore));
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, page, q, platformParam, catParam, products]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "600px" }, // ekrana çatmamış qabaqcadan yüklə
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, hasMore]);

  // Kateqoriya slug üzrə süzülür (dil-müstəqil), qiymət xam sentlə, sonra sıralama.
  const filteredProducts = allProducts
    .filter((p) => {
      if (selectedCategory !== "all" && p.categorySlug !== selectedCategory)
        return false;
      if (selectedBrand !== "all" && p.brand !== selectedBrand) return false;
      if (priceBounds.max > 0 && p.priceCents > priceCeiling) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "priceAsc":
          return a.priceCents - b.priceCents;
        case "priceDesc":
          return b.priceCents - a.priceCents;
        case "newest":
          return b.createdAt.localeCompare(a.createdAt);
        case "rating":
          return b.rating - a.rating;
        default:
          return 0; // "featured" — serverdən gələn sıra saxlanır
      }
    });

  const labelOf = (opts: Option[], value: string) =>
    opts.find((o) => o.value === value)?.label ?? value;

  const activeFilters = [
    selectedCategory !== "all" && labelOf(catOpts, selectedCategory),
    selectedBrand !== "all" && selectedBrand,
    priceCeiling < priceBounds.max && `≤ ${formatMoney(priceCeiling, priceCurrency)}`,
  ].filter(Boolean) as string[];

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedBrand("all");
    setMaxPrice(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-brand-ink">
            {q ? `“${q}”` : t.filters.allProducts}
          </h1>
          <p className="text-muted-foreground mt-1">
            {filteredProducts.length} {t.pages.productsFound}
          </p>
        </div>

        {/* ══════════ SECTION HEADER — bütün filtrlər burada ══════════
            Sol panel (sidebar) ləğv edildi: ekranın 1/4-ünü tuturdu, mobildə
            onsuz da görünmürdü və məhsul şəbəkəsini dar salırdı. Temu kimi
            filtrlər başlığın altında bir sırada, şəbəkə isə tam enlidir. */}
        <div className="mb-6 space-y-3 border-b border-border pb-4">
          {/* ALT KATEQORİYALAR.
              Zara-nın bəzi bölmələrində 40+ alt kateqoriya var. Hamısını bir
              üfüqi sətirdə vermək pisdir: istifadəçi ilk 8-10-dan sonrasını
              görmür və sürüşdürməyi ağlına gətirmir. Ona görə defolt olaraq
              məhdud sayda göstərilir, qalanı düymə ilə açılır (sətirlərə
              sarılır). SEÇİLİ kateqoriya həmişə görünür — siyahının sonunda
              olsa belə əvvələ çəkilir. */}
          {subcategories.length > 0 && (
            <div>
              <ul className="flex flex-wrap gap-2">
                {visibleSubcategories.map((s) => (
                  <li key={s.key}>
                    <Link
                      href={s.href}
                      className={`block whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                        s.key === activeCat
                          ? "bg-brand text-white"
                          : "bg-muted text-foreground/70 hover:bg-secondary hover:text-brand"
                      }`}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}

                {hiddenSubcategoryCount > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => setShowAllSubcategories((v) => !v)}
                      className="rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand hover:text-brand"
                    >
                      {showAllSubcategories
                        ? t.filters.showLess
                        : `+${hiddenSubcategoryCount}`}
                    </button>
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Filtr + sıralama çipləri — mobil və masaüstü EYNİ */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterDropdown
              value={selectedCategory}
              options={catOpts}
              onChange={setSelectedCategory}
              displayValue={
                selectedCategory === "all"
                  ? t.filters.category
                  : labelOf(catOpts, selectedCategory)
              }
            />
            <FilterDropdown
              value={selectedBrand}
              options={brandOpts}
              onChange={setSelectedBrand}
              displayValue={
                selectedBrand === "all" ? t.filters.brand : selectedBrand
              }
            />

            {priceBounds.max > priceBounds.min && (
              <FilterPopover
                label={
                  priceCeiling < priceBounds.max
                    ? `≤ ${formatMoney(priceCeiling, priceCurrency)}`
                    : t.filters.price
                }
                active={priceCeiling < priceBounds.max}
              >
                <PriceSlider
                  label={t.filters.price}
                  min={priceBounds.min}
                  max={priceBounds.max}
                  value={priceCeiling}
                  currency={priceCurrency}
                  onChange={setMaxPrice}
                />
              </FilterPopover>
            )}

            <FilterDropdown
              value={sortBy}
              options={sortOpts}
              onChange={setSortBy}
              displayValue={
                sortBy === "featured"
                  ? t.filters.sort
                  : labelOf(sortOpts, sortBy)
              }
            />

            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="ml-auto inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                {t.filters.clearFilters}
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className={PRODUCT_GRID_CLASS}>
          {filteredProducts.map((product) => (
            <Link key={product.id} href={`/products/${product.id}`} className="block">
              <article className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-brand/40 hover:shadow-xl hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden bg-muted">
                  <Image
                    src={product.img}
                    alt={product.name}
                    width={400}
                    height={400}
                    // Şəkillər Çin CDN-indən gəlir: yüklənənə qədər boş yer yox,
                    // shimmer görünsün. `loading` default olaraq "lazy"-dir.
                    placeholder="blur"
                    blurDataURL={PRODUCT_BLUR}
                    sizes={PRODUCT_IMAGE_SIZES}
                    className="h-full w-full object-contain rounded-md transition duration-500 group-hover:scale-110"
                  />

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

                  {/* Platforma nişanı — rəng BAZADAN gəlir (qayda #4), admin
                      /admin/platforms-dən dəyişir. Rəng yoxdursa nişan
                      göstərilmir (mənasız boz çip çıxmasın). */}
                  {product.sourceBadgeBg && (
                    <span
                      className="absolute left-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-md"
                      style={{
                        backgroundColor: product.sourceBadgeBg,
                        color: product.sourceBadgeFg,
                      }}
                    >
                      {product.sourceLabel ?? product.brand}
                    </span>
                  )}

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

                <div className="p-3 sm:p-4">
                  <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand transition-colors">
                    {product.name}
                  </p>

                  {/* RƏNG ÖNİZLƏMƏSİ — platforma eyni məhsulu hər rəng üçün
                      ayrıca sətir kimi verir; import onları birləşdirir, kart
                      isə burada neçə rəng olduğunu göstərir. Hex yoxdursa
                      rəng UYDURULMUR — nöqtə əvəzinə say yazılır. */}
                  {(product.colorPreview?.length ?? 0) > 1 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {product.colorPreview!.slice(0, 5).map((c) =>
                        c.hex ? (
                          <span
                            key={c.name}
                            title={c.name}
                            className="h-3 w-3 rounded-full border border-border"
                            style={{ backgroundColor: c.hex }}
                          />
                        ) : (
                          <span
                            key={c.name}
                            title={c.name}
                            className="h-3 w-3 rounded-full border border-border bg-muted"
                          />
                        ),
                      )}
                      <span className="ml-0.5 text-[10px] text-muted-foreground">
                        {product.colorPreview!.length}
                      </span>
                    </div>
                  )}

                  {/* Reytinq YALNIZ real dəyər varsa göstərilir. Zara API-si
                      reytinq vermir — 0 ulduz göstərmək "pis məhsul" təəssüratı
                      yaradır, uydurma reytinq isə müştərini aldatmaqdır. */}
                  {product.rating > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(product.rating) ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">({product.rating})</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <p className="text-lg font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                      {product.price}
                    </p>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Search className="h-6 w-6" />
            </span>
            <p className="mt-4 text-lg font-semibold text-brand-ink">
              {q ? t.common.noResults : t.filters.noProducts}
            </p>
            {q && (
              <p className="mt-1 text-sm text-muted-foreground">
                {t.common.noResultsHint}
              </p>
            )}
            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="mt-4 font-semibold text-brand hover:underline"
              >
                {t.filters.clearFilters}
              </button>
            )}
          </div>
        )}

        {/* Sonsuz scroll sensoru — görünəndə növbəti səhifə yüklənir */}
        {hasMore && filteredProducts.length > 0 && (
          <div ref={sentinelRef} className="flex justify-center py-10">
            <span
              aria-hidden
              className={`h-7 w-7 rounded-full border-2 border-brand/25 border-t-brand ${
                loadingMore ? "animate-spin" : "opacity-40"
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
