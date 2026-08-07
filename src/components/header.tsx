"use client";

import Link from "next/link";
import { ShoppingCart, Heart, User } from "lucide-react";
import { TopBar } from "@/components/header/top-bar";
import { CategoryBar } from "@/components/header/category-bar";
import type { HomeCategoryDTO } from "@/lib/data/catalog";
import { SearchBar } from "@/components/header/search-bar";
import { MobileMenu } from "@/components/header/mobile-menu";
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
  const { platform, setPlatform } = useSearch();
  const { totalItems } = useCart();
  const { totalItems: wishlistItems } = useWishlist();
  const { t } = useLang();

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        {/* 1) Üst zolaq — yalnız masaüstündə. Mobildə naviqasiyanı bottom-nav daşıyır. */}
        <div className="hidden md:block">
          <TopBar />
        </div>

        {/* 2) Əsas zolaq */}
        <div className="border-b border-border/60">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 md:gap-4 md:py-3">
            {/* Logo */}
            <Link
              href="/"
              className="font-display text-xl font-extrabold tracking-tight text-brand-ink shrink-0 md:text-2xl"
            >
              E-C<span className="text-brand">O</span>MMERCE
              <span className="text-brand">.</span>
            </Link>

            {/* Masaüstü — tam axtarış barı (platforma tabları + input) */}
            <div className="hidden flex-1 md:flex">
              <SearchBar
                platform={platform}
                onPlatformChange={setPlatform}
                categories={categories}
                platformCategories={platformCategories}
                platformSubcategories={platformSubcategories}
              />
            </div>

            {/* Mobil — EYNİ axtarış barı, sadəcə platforma tabları olmadan.
                Əvvəl burada dialoq açan düymə vardı; dialoq ləğv edildi. */}
            <div className="flex flex-1 md:hidden">
              <SearchBar
                compact
                platform={platform}
                onPlatformChange={setPlatform}
                categories={categories}
                platformCategories={platformCategories}
                platformSubcategories={platformSubcategories}
              />
            </div>

            {/* Actions — mobildə yalnız səbət, qalanı bottom-nav-dadır */}
            <div className="ml-auto flex items-center gap-3 sm:gap-4 shrink-0">
              <Link
                href={user ? "/panel" : "/login"}
                className="hidden items-center gap-1.5 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground md:flex"
              >
                <User className="h-5 w-5" />
                <span className="hidden md:inline">
                  {user ? user.fullName.split(" ")[0] : t.common.login}
                </span>
              </Link>

              <Link
                href="/wishlist"
                aria-label={t.nav.wishlist}
                className="relative hidden text-foreground/70 hover:text-foreground md:block"
              >
                <Heart className="h-5 w-5" />
                {wishlistItems > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {wishlistItems}
                  </span>
                )}
              </Link>

              {/* Səbət yalnız masaüstündə — mobildə aşağı paneldədir */}
              <Link
                href="/cart"
                aria-label={t.pages.cart}
                className="relative hidden text-foreground/70 transition-transform active:scale-90 hover:text-foreground md:block"
              >
                <ShoppingCart className="h-6 w-6 md:h-5 md:w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-2 -top-2 grid h-4 w-4 place-items-center rounded-full bg-brand text-[10px] font-bold text-brand-foreground">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Mobil burger menyu — giriş, qalan linklər, dil */}
              <MobileMenu user={user} />
            </div>
          </div>
        </div>

        {/* 3) Alt zolaq — kateqoriyalar, yalnız masaüstündə */}
        <div className="hidden md:block">
          <CategoryBar
            categories={categories}
            platformCategories={platformCategories}
            platformSubcategories={platformSubcategories}
          />
        </div>

      </header>
    </>
  );
}
