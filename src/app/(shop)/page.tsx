import { HeroCarousel } from "@/components/hero-carousel";
import {
  HeroSection,
  PerksSection,
  PlatformsStrip,
  CategoriesSection,
  PromoTiles,
  TrendingProducts,
  NewArrivals,
  MobileHome,
} from "@/components/home";
import type { Metadata } from "next";
import { getLang } from "@/lib/server-lang";
import { dict } from "@/lib/i18n";
import { alternatesFor } from "@/lib/seo/jsonld";
import { SHOW_PLATFORM_UI } from "@/lib/platform-visibility";
import {
  getTrendingProducts,
  getNewArrivals,
  getCategoriesForHome,
  getActivePlatforms,
  getCampaigns,
  getSlides,
  getPlatformCategories,
} from "@/lib/data/catalog";

/**
 * Ana səhifə metadata-sı DİLƏ görə qurulur. Kök layout-dakı default başlıq
 * yalnız azərbaycancadır; burada cookie-dəki dilə uyğun mətn verilir (qayda #5).
 */
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = dict[lang];
  return {
    title: t.seo.homeTitle,
    description: t.seo.homeDescription,
    alternates: alternatesFor("/"),
    openGraph: {
      type: "website",
      title: t.seo.homeTitle,
      description: t.seo.homeDescription,
      url: "/",
    },
  };
}

// Server komponenti — bütün home datası DB-dən gəlir (qayda #4). Dil cookie-dən (getLang).
export default async function HomePage() {
  const lang = await getLang();
  const [trending, newArrivals, categories, platforms, campaigns, slides] =
    await Promise.all([
    getTrendingProducts(lang),
    getNewArrivals(lang),
    getCategoriesForHome(lang),
    getActivePlatforms(lang),
    getCampaigns(lang),
    getSlides(lang),
  ]);

  // Hər aktiv platformanın ÖZ kateqoriya ağacı (1688-də var, Taobao-da API-də yoxdur).
  const platformCategories = Object.fromEntries(
    await Promise.all(
      platforms.map(
        async (p) => [p.key, await getPlatformCategories(p.key, lang, 200, "home")] as const,
      ),
    ),
  );

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto max-w-7xl px-4 py-0 md:py-6">
        {/* Mobil — tətbiq ana ekranı: kateqoriya dairələri, promo karuseli, məhsul lentləri */}
        <MobileHome
          categories={categories}
          platformCategories={platformCategories}
          campaigns={campaigns}
          trending={trending}
          newArrivals={newArrivals}
        />

        {/* Masaüstü — klassik səhifə düzümü */}
        <div className="hidden md:block">
          <div className="space-y-6">
            {/* Slayd BAZADAN gəlir (/admin/slides). Yoxdursa ehtiyat başlıq
                göstərilir — boş sahə qoymaq daha pisdir. */}
            {slides.length > 0 ? <HeroCarousel slides={slides} /> : <HeroSection />}
            <PerksSection />
          </div>

          <main className="mt-10 min-w-0 space-y-12">
            {SHOW_PLATFORM_UI && <PlatformsStrip platforms={platforms} />}
            <CategoriesSection
              categories={categories}
              platformCategories={platformCategories}
            />
            <PromoTiles campaigns={campaigns} />
            <TrendingProducts products={trending} />
            <NewArrivals products={newArrivals} />
          </main>
        </div>
      </div>
    </div>
  );
}
