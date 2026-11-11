import { HeroCarousel } from "@/components/hero-carousel";
import {
  HeroSection,
  PlatformsStrip,
  TrendingProducts,
  NewArrivals,
  CategoryRows,
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
  getActivePlatforms,
  getCampaigns,
  getSlides,
  getPopularCategoryRows,
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
  // Kateqoriya siyahıları ARTIQ BURADA ÇƏKİLMİR: kateqoriyalar header-in story
  // zolağına köçdü və onun datasını `(shop)/layout.tsx` verir. Əvvəl ana səhifə
  // eyni siyahıları təkrar çəkirdi (üstəlik hər platforma üçün ayrıca sorğu) —
  // istifadə olunmayan iş idi.
  const [trending, newArrivals, platforms, campaigns, slides, categoryRows] =
    await Promise.all([
      getTrendingProducts(lang),
      getNewArrivals(lang),
      getActivePlatforms(lang),
      getCampaigns(lang),
      getSlides(lang),
      // Populyar kateqoriyalar: 5 kateqoriya × 20 ən yeni məhsul.
      getPopularCategoryRows(lang, 5, 20),
    ]);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="container-fluid pb-0 pt-0 md:pb-6 md:pt-[18px]">
        {/* Mobil — tətbiq ana ekranı: kateqoriya dairələri, promo karuseli, məhsul lentləri */}
        <MobileHome
          campaigns={campaigns}
          trending={trending}
          newArrivals={newArrivals}
          categoryRows={categoryRows}
        />

        {/* Masaüstü — klassik səhifə düzümü */}
        <div className="hidden md:block">
          {/* Slayd BAZADAN gəlir (/admin/slides). Yoxdursa ehtiyat başlıq
              göstərilir — boş sahə qoymaq daha pisdir. */}
          {slides.length > 0 ? <HeroCarousel slides={slides} /> : <HeroSection />}

          <main className="mt-10 min-w-0 space-y-12">
            {/* BURADAN SİLİNƏNLƏR:
                · Kateqoriya bölməsi — eyni siyahı header-də story zolağındadır.
                · "Üstünlüklər" zolağı (Qlobal təchizat / Ən yaxşı qiymətlər /
                  Sürətli çatdırılma / 24/7 Dəstək) — `mock-data`-dakı sabit
                  siyahıdan qidalanırdı, yəni qayda #4-ə zidd idi.
                · Promo kartları — bannerlə eyni işi görürdü, təkrar idi.
                Üçü də bannerlə məhsul lentləri arasında yer yeyirdi. */}
            {SHOW_PLATFORM_UI && <PlatformsStrip platforms={platforms} />}
            <TrendingProducts products={trending} />
            {/* Populyar kateqoriyalar — hər biri öz məhsul karuseli ilə.
                Trend ilə "yeni gələnlər" arasındadır: ümumi lentdən sonra
                kateqoriya üzrə dərinliyə keçid təbii oxunur. */}
            <CategoryRows rows={categoryRows} />
            <NewArrivals products={newArrivals} />
          </main>
        </div>
      </div>
    </div>
  );
}
