"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { PRODUCT_BLUR } from "@/lib/image-placeholder";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Heart, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus, ChevronRight, ChevronLeft, ChevronUp, ChevronDown } from "lucide-react";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import type { ProductDTO } from "@/lib/data/catalog";
import { formatMoney } from "@/lib/format";
import { findVariant, imageForSelection } from "@/lib/products/variants";
import { VariantPicker } from "./variant-picker";
import { ProductSpecs } from "./product-specs";

// Məhsul detalı — məlumat DB-dən (server) props ilə gəlir.
export function ProductDetail({
  product,
  related,
}: {
  product: ProductDTO;
  related: ProductDTO[];
}) {
  const { t } = useLang();

  const [selectedImage, setSelectedImage] = useState(0);
  const thumbsRef = useRef<HTMLDivElement | null>(null);

  /** Əsas şəkildə sağa/sola keçid — sonuncudan sonra əvvələ dövr edir. */
  const step = (delta: number) => {
    if (images.length < 2) return;
    setSelectedImage((i) => (i + delta + images.length) % images.length);
  };

  /**
   * Thumb lentini sürüşdürür. Masaüstündə lent ŞAQULİ (solda), mobildə ÜFÜQİ
   * (altda) olduğu üçün istiqamət ekran ölçüsünə görə seçilir — eyni düymə
   * hər iki düzülüşdə düzgün işləsin.
   */
  const scrollThumbs = (dir: -1 | 1) => {
    const el = thumbsRef.current;
    if (!el) return;
    const vertical =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    el.scrollBy(
      vertical
        ? { top: dir * 260, behavior: "smooth" }
        : { left: dir * 260, behavior: "smooth" },
    );
  };
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  /* ----------------------------- variantlar ----------------------------- */
  // Platforma fərqi adapter qatında həll olunub — burada yalnız ortaq DTO var.
  const variants = product.variants;
  const hasVariants = (variants?.axes.length ?? 0) > 0;

  const [selection, setSelection] = useState<Record<string, string>>({});

  const currentVariant = useMemo(
    () => (variants ? findVariant(variants, selection) : undefined),
    [variants, selection],
  );

  // Rəng seçiləndə qalereyanın dəyişməsi məhz budur: seçimə uyğun şəkil.
  const variantImage = useMemo(
    () => (variants ? imageForSelection(variants, selection) : undefined),
    [variants, selection],
  );

  const handleSelectOption = (axisKey: string, value: string) => {
    setSelection((prev) => {
      // Eyni dəyərə təkrar klik → seçimi ləğv edir (filtr kimi).
      const next = { ...prev };
      if (next[axisKey] === value) delete next[axisKey];
      else next[axisKey] = value;
      return next;
    });
  };

  /** Seçilmiş oxun dəyəri — səbətə `size`/`color` kimi ötürmək üçün. */
  const valueOfKind = (kind: "color" | "size"): string | undefined => {
    const axis = variants?.axes.find((a) => a.kind === kind);
    return axis ? selection[axis.key] : undefined;
  };
  const router = useRouter();
  const { addItem, closeCart } = useCart();
  const { toggleItem, isInWishlist } = useWishlist();

  /**
   * Seçilməli olub SEÇİLMƏYƏN oxların adları.
   *
   * Variantlı məhsulda platformadan gələn hər ox (rəng, ölçü, ...) məcburidir —
   * konkret SKU olmadan sifariş verilə bilmir. Variantsız (seed) məhsullarda
   * isə köhnə `sizes`/`colors` siyahıları eyni rolu oynayır.
   */
  const missingSelection = useMemo<string[]>(() => {
    if (hasVariants && variants) {
      return variants.axes
        .filter((axis) => !selection[axis.key])
        .map((axis) => axis.label);
    }
    const missing: string[] = [];
    if ((product.sizes?.length ?? 0) > 0 && !selectedSize)
      missing.push(t.product.size);
    if ((product.colors?.length ?? 0) > 0 && !selectedColor)
      missing.push(t.product.color);
    return missing;
  }, [
    hasVariants,
    variants,
    selection,
    product.sizes,
    product.colors,
    selectedSize,
    selectedColor,
    t.product.size,
    t.product.color,
  ]);

  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Seçim tamamlananda xəbərdarlıq özü yox olur — istifadəçi onu əl ilə
  // bağlamağa məcbur olmasın.
  const canAddToCart = missingSelection.length === 0;

  const handleAddToCart = () => {
    // ÖLÇÜ/RƏNG SEÇİLMƏDƏN SƏBƏTƏ ATILMIR.
    //
    // Əvvəl seçim etməsən də düymə işləyirdi və səbətə variantsız sətir
    // düşürdü — operator hansı ölçünü alacağını bilmirdi, müştəri isə
    // "seçmişəm" zənn edirdi. İndi çatışmayan ox göstərilir.
    if (missingSelection.length > 0) {
      setSelectionError(missingSelection.join(", "));
      return;
    }
    setSelectionError(null);

    // Variantlı məhsulda səbətə SEÇİLMİŞ variantın qiyməti düşür.
    // Formatlanmış mətn deyil, xam sent saxlanılır — valyuta itməsin.
    const priceCents = currentVariant?.priceCents ?? product.priceCents;

    // Miqdar bir çağırışda ötürülür — əvvəl dövrə ilə N dəfə çağırılırdı.
    addItem(
      {
        id: product.id,
        name: product.name,
        priceCents,
        currency: product.currency,
        brand: product.brand,
        img: currentVariant?.image ?? variantImage ?? product.img,
        size: (hasVariants ? valueOfKind("size") : selectedSize) || undefined,
        color: (hasVariants ? valueOfKind("color") : selectedColor) || undefined,
        variantId: currentVariant?.id,
        sku: currentVariant?.sku,
      },
      quantity,
    );
  };

  const handleBuyNow = () => {
    // Seçim yarımçıqdırsa çekauta KEÇMİRİK — əks halda boş səbətlə
    // ödəniş səhifəsinə düşərdi.
    if (missingSelection.length > 0) {
      setSelectionError(missingSelection.join(", "));
      return;
    }
    handleAddToCart();
    closeCart();
    router.push("/checkout");
  };

  const handleRelatedAddToCart = (e: React.MouseEvent, item: ProductDTO) => {
    e.preventDefault();
    addItem({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      currency: item.currency,
      brand: item.brand,
      img: item.img,
    });
  };

  const handleToggleWishlist = () => {
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

  const handleRelatedToggleWishlist = (e: React.MouseEvent, item: ProductDTO) => {
    e.preventDefault();
    toggleItem({
      id: item.id,
      name: item.name,
      priceCents: item.priceCents,
      currency: item.currency,
      brand: item.brand,
      img: item.img,
      rating: item.rating,
    });
  };

  /**
   * QALEREYA — göstərilən şəkillərin YEGANƏ siyahısı.
   *
   * Əvvəl əsas şəkil `variantImage ?? images[selectedImage]` idi, yəni variant
   * şəkli hər zaman üstün gəlirdi və thumb-a klik heç nə dəyişmirdi.
   * (`findVariant` BOŞ seçimlə də ilk variantı qaytarır — `[].every()` true
   * olduğu üçün — deməli `variantImage` demək olar həmişə dolu idi.)
   *
   * İndi tək həqiqət `selectedImage` indeksidir. Variantın şəkli siyahıda
   * yoxdursa əvvələ ƏLAVƏ olunur ki, seçiləndə həm görünsün, həm də öz
   * thumb-ı seçili görünsün.
   */
  const images = useMemo(() => {
    const base =
      product.images && product.images.length > 0
        ? product.images
        : [product.img];
    return variantImage && !base.includes(variantImage)
      ? [variantImage, ...base]
      : base;
  }, [product.images, product.img, variantImage]);

  // Rəng seçiləndə qalereya o şəklə keçir — thumb da avtomatik seçili olur.
  useEffect(() => {
    if (!variantImage) return;
    const i = images.indexOf(variantImage);
    if (i >= 0) setSelectedImage(i);
  }, [variantImage, images]);

  // UYDURMA ölçü/rəng YOXDUR (qayda #4): platforma verməyibsə blok göstərilmir.
  // Variantlı məhsullarda bunların yerini `VariantPicker` tutur.
  const sizes = product.sizes ?? [];
  const colors = product.colors ?? [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container-fluid pb-24 pt-4 md:pb-8 md:pt-8">
        {/* Breadcrumb */}
        <nav className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">{t.product.home}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/products" className="hover:text-foreground transition-colors">{t.product.products}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* ══════════ QALEREYA ══════════
              Masaüstündə kiçik şəkillər ƏSAS ŞƏKLİN SOLUNDA şaquli sütundur
              (əvvəl altda idi — səhifəni uzadır və məhsul məlumatını aşağı
              itələyirdi). Mobildə yer olmadığı üçün altda üfüqi qalır. */}
          <div className="flex flex-col gap-3 md:flex-row">
            {/* THUMB SÜTUNU — mobildə sıra 2 (altda), masaüstündə sıra 1 (solda) */}
            {images.length > 1 && (
              <div className="group/thumbs relative order-2 shrink-0 md:order-1 md:w-20">
                <button
                  type="button"
                  aria-label="←"
                  onClick={() => scrollThumbs(-1)}
                  className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-card/90 p-1.5 shadow-md ring-1 ring-border hover:bg-card group-hover/thumbs:block md:left-1/2 md:top-0 md:-translate-x-1/2 md:translate-y-0"
                >
                  <ChevronLeft className="h-4 w-4 md:hidden" />
                  <ChevronUp className="hidden h-4 w-4 md:block" />
                </button>
                <button
                  type="button"
                  aria-label="→"
                  onClick={() => scrollThumbs(1)}
                  className="absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-card/90 p-1.5 shadow-md ring-1 ring-border hover:bg-card group-hover/thumbs:block md:left-1/2 md:right-auto md:top-auto md:bottom-0 md:-translate-x-1/2 md:translate-y-0"
                >
                  <ChevronRight className="h-4 w-4 md:hidden" />
                  <ChevronDown className="hidden h-4 w-4 md:block" />
                </button>

                <div
                  ref={thumbsRef}
                  className="flex gap-3 overflow-x-auto scrollbar-hide md:max-h-[560px] md:flex-col md:overflow-x-hidden md:overflow-y-auto"
                >
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`relative aspect-square w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                        selectedImage === index
                          ? "border-brand ring-2 ring-brand/20"
                          : "border-transparent hover:border-gray-300"
                      }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} ${index + 1}`}
                        fill
                        sizes="96px"
                        className="bg-gray-50 object-contain p-2"
                        placeholder="blur"
                        blurDataURL={PRODUCT_BLUR}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ƏSAS ŞƏKİL */}
            <div className="order-1 min-w-0 flex-1 md:order-2">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100">
              {/* Variant (rəng) seçilibsə onun şəkli üstünlük təşkil edir. */}
              <Image
                src={images[selectedImage] ?? product.img}
                alt={product.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain p-8"
                placeholder="blur"
                blurDataURL={PRODUCT_BLUR}
                priority
              />
              {/* Şəkillər arası keçid — sonuncudan sonra əvvələ dövr edir.
                  Yalnız birdən çox şəkil olanda göstərilir. */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="\u2190"
                    onClick={() => step(-1)}
                    className="absolute left-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 shadow-md ring-1 ring-border backdrop-blur transition hover:bg-card"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="\u2192"
                    onClick={() => step(1)}
                    className="absolute right-3 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card/85 shadow-md ring-1 ring-border backdrop-blur transition hover:bg-card"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-medium text-white">
                    {selectedImage + 1} / {images.length}
                  </span>
                </>
              )}

              {product.originalPrice && (
                <span className="absolute left-4 top-4 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
                  Sale
                </span>
              )}
              <button
                onClick={handleToggleWishlist}
                className={`absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full transition-all duration-300 ${
                  isInWishlist(product.id)
                    ? "bg-red-500 text-white"
                    : "bg-white/80 backdrop-blur-sm text-gray-400 hover:bg-red-500 hover:text-white"
                }`}
              >
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? "fill-current" : ""}`} />
              </button>
            </div>

            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              {/* Brend nişanı — brend yoxdursa boş pill qalmasın.
                  (1688-də brend sahəsi olmur, bax `brandLabel`.) */}
              {product.brand && (
                <span
                  className="mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold"
                  style={{
                    backgroundColor: product.sourceBadgeBg ?? "var(--color-brand)",
                    color: product.sourceBadgeFg ?? "#fff",
                  }}
                >
                  {product.brand}
                </span>
              )}
              <h1 className="text-3xl font-bold text-brand-ink">{product.name}</h1>
            </div>

            {/* Platforma reytinq vermirsə (məs. Zara) blok ümumiyyətlə
                render olunmur — 0 ulduz yanlış təəssürat yaradır. */}
            {product.rating > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(product.rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "fill-gray-200 text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-foreground">{product.rating}</span>
                {(product.reviewCount ?? 0) > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({product.reviewCount} {t.product.reviews})
                  </span>
                )}
              </div>
            )}

            <div className="flex items-baseline gap-3">
              {/* Variant seçiləndə qiymət də ona görə dəyişir. */}
              <span className="text-3xl font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                {currentVariant
                  ? formatMoney(currentVariant.priceCents, product.currency)
                  : product.price}
              </span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {product.originalPrice}
                  </span>
                  <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                    {Math.round((1 - parseFloat(product.price.slice(1)) / parseFloat(product.originalPrice.slice(1))) * 100)}% {t.product.off}
                  </span>
                </>
              )}
            </div>

            {/* Təsvir YALNIZ platformadan gəlibsə göstərilir (qayda #4).
                Əvvəl təsvir olmayanda uydurma şablon mətn çıxırdı və əsl
                məhsul təsviri kimi oxunurdu — bu, müştərini aldadırdı. */}
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            )}

            {/* Variantlar — platformadan gələn rəng/ölçü/digər oxlar (ortaq DTO) */}
            {hasVariants && variants && (
              <VariantPicker
                data={variants}
                selection={selection}
                onSelect={handleSelectOption}
              />
            )}

            {/* Seçilmiş variantın məlumatları */}
            {hasVariants && (
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {currentVariant?.sku && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">{t.product.sku}:</dt>
                    <dd className="font-medium text-foreground">{currentVariant.sku}</dd>
                  </div>
                )}
                {currentVariant && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">{t.product.stock}:</dt>
                    <dd className="font-medium text-foreground">
                      {currentVariant.stock} {variants?.unit ?? ""}
                    </dd>
                  </div>
                )}
                {(variants?.minOrderQty ?? 1) > 1 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">{t.product.minOrder}:</dt>
                    <dd className="font-medium text-foreground">
                      {variants?.minOrderQty} {variants?.unit ?? ""}
                    </dd>
                  </div>
                )}
              </dl>
            )}

            {/* Color Selection — YALNIZ variantsız (seed) məhsullarda */}
            {!hasVariants && colors.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">
                {t.product.color}: <span className="font-normal text-muted-foreground">{selectedColor || t.product.selectColor}</span>
              </p>
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`h-10 w-10 rounded-full border-2 transition-all ${
                      selectedColor === color.name
                        ? "border-brand ring-2 ring-brand/20 scale-110"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            )}

            {/* Size Selection — YALNIZ variantsız (seed) məhsullarda */}
            {!hasVariants && sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-foreground">
                  {t.product.size}: <span className="font-normal text-muted-foreground">{selectedSize || t.product.selectSize}</span>
                </p>
                <button className="text-sm text-brand hover:underline">{t.product.sizeGuide}</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`min-w-[3rem] rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition-all ${
                      selectedSize === size
                        ? "border-brand bg-brand text-white"
                        : "border-gray-200 hover:border-brand hover:text-brand"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Quantity */}
            <div>
              <p className="text-sm font-semibold text-foreground mb-3">{t.product.quantity}</p>
              <div className="flex items-center gap-1 w-fit rounded-lg border border-gray-200">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="grid h-10 w-10 place-items-center text-gray-500 hover:text-foreground transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="grid h-10 w-10 place-items-center text-gray-500 hover:text-foreground transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Add to Cart */}
            <div className="hidden pt-2 md:block">
              {/* Çatışmayan seçim — düymə basılanda görünür, seçim
                  tamamlananda özü yox olur. */}
              {selectionError && !canAddToCart && (
                <p
                  role="alert"
                  className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
                >
                  {t.product.selectRequired}: {selectionError}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  aria-disabled={!canAddToCart}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold transition-colors ${
                    canAddToCart
                      ? "bg-brand-ink text-white hover:bg-brand"
                      : "cursor-not-allowed bg-muted text-muted-foreground"
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {t.common.addToCart}
                </button>
                <button
                  onClick={handleBuyNow}
                  aria-disabled={!canAddToCart}
                  className={`rounded-full border-2 px-6 py-4 text-sm font-semibold transition-colors ${
                    canAddToCart
                      ? "border-brand bg-brand/5 text-brand hover:bg-brand hover:text-white"
                      : "cursor-not-allowed border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {t.product.buyNow}
                </button>
              </div>
            </div>

            {/* Perks */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <Truck className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.product.freeShipping}</p>
                  <p className="text-[10px] text-muted-foreground">{t.product.freeShippingSub}</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <RotateCcw className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.product.easyReturns}</p>
                  <p className="text-[10px] text-muted-foreground">{t.product.easyReturnsSub}</p>
                </div>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gray-50 to-gray-100">
                  <Shield className="h-5 w-5 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{t.product.securePayment}</p>
                  <p className="text-[10px] text-muted-foreground">{t.product.securePaymentSub}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Platformadan gələn xüsusiyyətlər + topdan qiymət pillələri */}
        {variants && <ProductSpecs data={variants} currency={product.currency} />}

        {/* Related Products */}
        <section className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-brand-ink">{t.product.youMayAlsoLike}</h2>
            <Link href="/products" className="text-sm font-bold text-foreground hover:underline">
              {t.common.seeAll}
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {related.map((item) => (
              <Link key={item.id} href={`/products/${item.id}`} className="block">
                <article className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-brand/20 hover:-translate-y-1">
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                    <Image
                      src={item.img}
                      alt={item.name}
                      width={400}
                      height={400}
                      sizes="(max-width: 640px) 50vw, 25vw"
                      placeholder="blur"
                      blurDataURL={PRODUCT_BLUR}
                      className="h-full w-full object-contain rounded-md transition duration-500 group-hover:scale-110"
                    />

                    <button
                      aria-label={t.product.saveToWishlist}
                      onClick={(e) => handleRelatedToggleWishlist(e, item)}
                      className={`absolute cursor-pointer right-2 top-2 grid h-8 w-8 place-items-center rounded-full shadow-md transition-all duration-300 hover:scale-110 ${
                        isInWishlist(item.id)
                          ? "bg-red-500 text-white"
                          : "bg-white/80 backdrop-blur-sm text-gray-400 hover:bg-red-500 hover:text-white"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isInWishlist(item.id) ? "fill-current" : ""}`} />
                    </button>

                    {item.brand && (
                      <span className="absolute left-2 top-2 rounded-full bg-gradient-to-r from-brand to-purple-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-md">
                        {item.brand}
                      </span>
                    )}

                    <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-300">
                      <button
                        onClick={(e) => handleRelatedAddToCart(e, item)}
                        className="w-full cursor-pointer flex items-center justify-center gap-1.5 bg-brand-ink/90 sm:bg-brand-ink text-white py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-semibold hover:bg-brand transition-colors"
                      >
                        <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        {t.common.addToCart}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 sm:p-4">
                    <p className="truncate text-sm font-semibold text-gray-800 group-hover:text-brand transition-colors">
                      {item.name}
                    </p>

                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3 w-3 ${
                              i < Math.floor(item.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">({item.rating})</span>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-bold bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                        {item.price}
                      </p>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Mobil — sabit alış paneli */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur md:hidden">
        {selectionError && !canAddToCart && (
          <p
            role="alert"
            className="mb-2 rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive"
          >
            {t.product.selectRequired}: {selectionError}
          </p>
        )}
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-[10px] text-muted-foreground">{t.pages.subtotal}</p>
            <p className="text-lg font-bold text-brand-ink">{product.price}</p>
          </div>
          <button
            onClick={handleAddToCart}
            aria-label={t.common.addToCart}
            aria-disabled={!canAddToCart}
            className={`ml-auto grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 transition-transform active:scale-90 ${
              canAddToCart
                ? "border-brand text-brand"
                : "border-border text-muted-foreground"
            }`}
          >
            <ShoppingCart className="h-5 w-5" />
          </button>
          <button
            onClick={handleBuyNow}
            aria-disabled={!canAddToCart}
            className={`flex-1 rounded-full py-3.5 text-sm font-semibold transition-transform active:scale-95 ${
              canAddToCart
                ? "bg-brand text-brand-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t.product.buyNow}
          </button>
        </div>
      </div>
    </div>
  );
}
