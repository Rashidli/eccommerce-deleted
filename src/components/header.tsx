"use client";

import Link from "next/link";
import { ShoppingCart, Heart, User, Search, X } from "lucide-react";
import { CategoryBar } from "@/components/header/category-bar";
import { CatalogMenu } from "@/components/header/catalog-menu";
import type { HomeCategoryDTO } from "@/lib/data/catalog";
import { SearchBar } from "@/components/header/search-bar";
import { MobileMenu } from "@/components/header/mobile-menu";
import { LangSwitcher } from "@/components/lang-switcher";
import { useCart } from "@/context/cart-context";
import { useWishlist } from "@/context/wishlist-context";
import { useLang } from "@/context/lang-context";
import { useSearch } from "@/context/search-context";

export function Header({
  user,
  categories = [],
  platformCategories,
  platformSubcategories,
}: {
  user?: { fullName: string } | null;
  /** Kateqoriya zolağı üçün — DB-dən (qayda #4). */
  categories?: HomeCategoryDTO[];
  platformCategories?: Record<string, HomeCategoryDTO[]>;
  /** { platformaAçarı: { valideynId: alt kateqoriyalar } } — nav dropdown-u üçün. */
  platformSubcategories?: Record<string, Record<string, HomeCategoryDTO[]>>;
}) {
  const { platform, setPlatform, searchOpen, setSearchOpen } = useSearch();
  const { totalItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { t } = useLang();

  return (
    <>
      <header className="sticky top-0 z-30 bg-background pt-[env(safe-area-inset-top)]">
        {/* ÜST ZOLAQ SİLİNDİ: nazik naviqasiya zolağı `mock-data`-dakı sabit
            linklərdən qidalanırdı (qayda #4-ə zidd) və yer yeyirdi. İçindəki
            yeganə lazımlı element — dil seçici — sağdakı ikon qrupuna keçdi. */}

        {/* 1) Əsas zolaq — masaüstündə 138px sabit hündürlük. */}
        <div className="border-b border-border/60">
          <div className="container-fluid flex items-center gap-3 py-3 md:h-[138px] md:gap-0 md:py-0">
            {/* Logo.
                `w-[165px]` SABİT en idi və mətn ora sığmırdı — "E-" yuxarıda
                qalıb qalanı aşağı sətrə düşürdü. İndi `min-w` + `whitespace-nowrap`:
                165px ölçü qorunur, amma mətn heç vaxt qırılmır. */}
            <Link
              href="/"
              className="shrink-0 whitespace-nowrap font-display text-xl font-extrabold tracking-tight text-brand-ink md:min-w-[165px] md:text-[1.6rem]"
            >
              E-C<span className="text-brand">O</span>MMERCE
              <span className="text-brand">.</span>
            </Link>

            {/* Logo ilə "Kataloq" arasındakı boşluq. Sabit 145px yalnız çox
                geniş ekranda saxlanılır — dar ekranda sıxılır ki, axtarış
                paneli yer tapsın. */}
            <span
              aria-hidden
              className="hidden shrink md:block md:w-10 xl:w-[145px]"
            />

            {/* Kataloq — mega-menyunu açır. Əvvəl sadəcə `/categories`
                səhifəsinə link idi; ağacı görmək üçün səhifə dəyişmək
                lazım gəlirdi. */}
            <CatalogMenu />

            {/* Axtarış paneli — Kataloq düyməsindən 20px sonra, qalan sahəni
                tutur, 970px-dən enli olmur. */}
            <div className="hidden min-w-0 flex-1 md:flex lg:ml-5 lg:max-w-[970px]">
              <SearchBar
                platform={platform}
                onPlatformChange={setPlatform}
                categories={categories}
                platformCategories={platformCategories}
                platformSubcategories={platformSubcategories}
              />
            </div>

            {/* Mobil — input BURADA deyil.
                Səbəb: daimi input brend adını sıxışdırırdı (ad nə qədər uzun
                olsa, bir o qədər). İndi yalnız lupa düyməsi durur, input isə
                başlığın ALTINDA, tam enlə açılır (aşağıda). */}
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              aria-label={searchOpen ? t.common.close : t.common.search}
              aria-expanded={searchOpen}
              className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground/70 transition-colors active:scale-90 hover:bg-secondary hover:text-foreground md:hidden"
            >
              {searchOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>

            {/* İkonlar — masaüstündə 60×60 dairə, aralarında 20px.
                Səbət brend rəngindədir (əsas hərəkət), qalanları neytral fonda.
                Mobildə yalnız burger qalır — qalan naviqasiya bottom-nav-dadır. */}
            <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4 md:ml-5 md:gap-5">
              <IconButton
                href={user ? "/panel" : "/login"}
                label={user ? user.fullName.split(" ")[0] : t.common.login}
              >
                <User className="h-5 w-5" />
              </IconButton>

              <IconButton href="/wishlist" label={t.nav.wishlist} badge={wishlistItems}>
                <Heart className="h-5 w-5" />
              </IconButton>

              <IconButton href="/cart" label={t.pages.cart} badge={totalItems} accent>
                <ShoppingCart className="h-5 w-5" />
              </IconButton>

              {/* Dil — eyni dairə ölçüsündə, ikon qrupunun sonunda */}
              <div className="hidden md:grid md:h-[60px] md:w-[60px] md:place-items-center md:rounded-full md:bg-secondary">
                <LangSwitcher />
              </div>

              {/* Mobil burger menyu — giriş, qalan linklər, dil */}
              <MobileMenu user={user} />
            </div>
          </div>

          {/* 2b) Mobil axtarış — lupa ilə açılır, tam en. `grid-rows` keçidi
                  hündürlüyü animasiya etməyə imkan verir (`height:auto`
                  animasiya olunmur, ona görə `1fr`/`0fr` işlədilir). */}
          <div
            className={`grid overflow-hidden transition-[grid-template-rows] duration-200 md:hidden ${
              searchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="min-h-0">
              <div className="px-4 pb-3">
                <SearchBar
                  compact
                  platform={platform}
                  onPlatformChange={setPlatform}
                  categories={categories}
                  platformCategories={platformCategories}
                  platformSubcategories={platformSubcategories}
                />
              </div>
            </div>
          </div>
        </div>

      </header>

      {/* Kateqoriya "story" paneli — header-in İÇİNDƏ DEYİL, ondan sonra gələn
          müstəqil kartdır. Səbəb: header `sticky`-dir; panel də orada qalsaydı
          səhifə sürüşdükcə ekranın 170px-ni daim tutardı. İndi məzmunla birlikdə
          yuxarı sürüşür.

          MOBİLDƏ DƏ GÖRÜNÜR: əvvəlki mətn həbləri dar ekrana sığmırdı, dairəvi
          lent isə mobil üçün doğulub. Ana səhifədəki kateqoriya bölmələri
          bunun əvəzinə silindi. */}
      <CategoryBar
        categories={categories}
        platformCategories={platformCategories}
      />
    </>
  );
}

/**
 * Header ikon düyməsi — masaüstündə 60×60 dairə, mobildə sadə ikon.
 *
 * Ayrıca komponent olması təkrarı yığır: dörd düymə eyni ölçü, eyni fon və
 * eyni nişan (badge) məntiqini paylaşır; əvvəl hər biri öz sinif sətrini
 * daşıyırdı və biri dəyişəndə qalanları geridə qalırdı.
 */
function IconButton({
  href,
  label,
  badge = 0,
  accent = false,
  children,
}: {
  href: string;
  label: string;
  /** 0-dan böyükdürsə sağ üstdə say göstərilir. */
  badge?: number;
  /** Səbət kimi əsas hərəkət — brend fonunda. */
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`relative hidden shrink-0 place-items-center rounded-full transition-opacity hover:opacity-80 md:grid md:h-[60px] md:w-[60px] ${
        accent
          ? "bg-brand text-brand-foreground"
          : "bg-secondary text-foreground/75"
      }`}
    >
      {children}
      {badge > 0 && (
        <span
          className={`absolute right-0 top-0 grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
            accent ? "bg-brand-ink text-white" : "bg-destructive text-white"
          }`}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}
