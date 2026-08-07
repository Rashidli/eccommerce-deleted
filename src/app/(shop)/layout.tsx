import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/context/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { WishlistProvider } from "@/context/wishlist-context";
import { BottomNav } from "@/components/bottom-nav";
import { LangProvider } from "@/context/lang-context";
import { SearchProvider } from "@/context/search-context";
import { ServiceWorker } from "@/components/service-worker";
import { getCurrentUser } from "@/lib/user-session";
import { getLang } from "@/lib/server-lang";
import { getPlatform } from "@/lib/server-platform";
import {
  getActivePlatforms,
  getCategoriesForHome,
  getPlatformCategories,
  getPlatformSubcategories,
} from "@/lib/data/catalog";

// Mağazanın çərçivəsi: başlıq, alt naviqasiya, səbət — admin bunları görmür.
export default async function ShopLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Header/bottom-nav auth vəziyyətini göstərsin deyə cari istifadəçi serverdə oxunur.
  // Axtarış platformaları DB-dən (yalnız aktivlər) — statik JSON deyil (qayda #4).
  const lang = await getLang();
  const [user, platforms, categories, savedPlatform] = await Promise.all([
    getCurrentUser(),
    getActivePlatforms(lang),
    getCategoriesForHome(lang),
    getPlatform(),
  ]);

  // Header kateqoriya zolağı da platformaya görə dəyişir — hər aktiv platformanın
  // öz ağacı (1688-də var, Taobao-da API-də yoxdur).
  const platformCategories = Object.fromEntries(
    await Promise.all(
      platforms.map(
        async (p) => [p.key, await getPlatformCategories(p.key, lang, 200, "nav")] as const,
      ),
    ),
  );

  // Nav dropdown-u üçün alt kateqoriyalar — yalnız zolaqda görünənlərin uşaqları.
  const platformSubcategories = Object.fromEntries(
    await Promise.all(
      platforms.map(
        async (p) =>
          [
            p.key,
            await getPlatformSubcategories(
              p.key,
              lang,
              (platformCategories[p.key] ?? []).map((c) => c.key),
            ),
          ] as const,
      ),
    ),
  );

  return (
    <LangProvider>
      <SearchProvider platforms={platforms} initialPlatform={savedPlatform}>
        <CartProvider>
          <WishlistProvider>
            {/* Mobildə sabit alt bar üçün yer ayrılır */}
            <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
              <Header
                user={user}
                categories={categories}
                platformCategories={platformCategories}
                platformSubcategories={platformSubcategories}
              />
              {children}
              {/* Footer yalnız masaüstündə — mobildə tətbiq görünüşü saxlanılır. */}
              <div className="hidden md:block">
                <Footer />
              </div>
            </div>
            <CartDrawer />
            <BottomNav user={user} />
            <ServiceWorker />
          </WishlistProvider>
        </CartProvider>
      </SearchProvider>
    </LangProvider>
  );
}
