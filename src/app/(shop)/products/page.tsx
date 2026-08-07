import { Suspense } from "react";
import type { Metadata } from "next";
import { getLang } from "@/lib/server-lang";
import { getPlatform } from "@/lib/server-platform";
import { dict } from "@/lib/i18n";
import { JsonLd, breadcrumbLd, alternatesFor } from "@/lib/seo/jsonld";
import { getPlatformCategorySeo } from "@/lib/seo/product-seo";
import { DEFAULT_PLATFORM, categoryHref } from "@/lib/platform-visibility";
import {
  getProducts,
  searchProducts,
  getCategoriesForHome,
  getBrands,
  getProductsByIds,
  getSidebarSubcategories,
  type ProductDTO,
} from "@/lib/data/catalog";
import {
  importPartzonaSearch,
  importPartzonaCategory,
  dbCategoryProductIds,
} from "@/lib/partzona/search";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ProductsFilter } from "./products-filter";

/** İlk səhifədə göstərilən məhsul sayı — `/api/search` ilə EYNİ olmalıdır,
 *  yoxsa sonsuz scroll ya məhsul atlayır, ya da təkrar göstərir. */
const PAGE_SIZE = 20;

// Məhsullar — DB-dən. `q` varsa dil-həssas axtarış, yoxsa bütün aktiv məhsullar.
// Kateqoriya/brend siyahıları da DB-dən gəlir (qayda #4 — hardcoded siyahı yoxdur).

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string; cat?: string }>;
}): Promise<Metadata> {
  const { q, platform, cat } = await searchParams;
  const lang = await getLang();
  const t = dict[lang];
  const query = q?.trim() ?? "";

  // 1) AXTARIŞ nəticələri — indekslənmir. Sonsuz sayda sorğu kombinasiyası
  //    "faceted" zibil səhifələr yaradar; `follow` qalır ki, məhsul linkləri
  //    yenə də taranmasın deyil, taransın.
  if (query) {
    return {
      title: t.seo.searchTitle.replace("{query}", query),
      description: t.seo.productsDescription,
      robots: { index: false, follow: true },
    };
  }

  // 2) KATEQORİYA baxışı — indekslənən səth, adı DB-dən.
  if (cat) {
    const platformKey =
      platform && platform !== "all" ? platform : DEFAULT_PLATFORM;
    const category = await getPlatformCategorySeo(platformKey, cat, lang);
    if (category) {
      const path = categoryHref(platformKey, cat);
      return {
        title: t.seo.categoryBrowseTitle.replace("{category}", category.name),
        // Qeyd: mətndə `{platform}` yoxdur — tədarükçünün adı meta təsvirdə
        // (yəni axtarış nəticələrində) görünməməlidir.
        description: t.seo.categoryBrowseDescription.replace(
          "{category}",
          category.name,
        ),
        alternates: alternatesFor(path),
        openGraph: { type: "website", title: category.name, url: path },
      };
    }
  }

  // 3) Bütün məhsullar.
  return {
    title: t.seo.productsTitle,
    description: t.seo.productsDescription,
    alternates: alternatesFor("/products"),
  };
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; platform?: string; cat?: string }>;
}) {
  const { q, platform, cat } = await searchParams;

  // VACİB: data çəkilişi Suspense-in İÇİNDƏ olmalıdır. Əks halda səhifə
  // komponenti data gələnə qədər gözləyir və istifadəçi heç bir yüklənmə
  // göstəricisi görmür (kateqoriya seçəndə "işləmir" təsiri yaranırdı).
  return (
    <Suspense
      key={`${q ?? ""}|${platform ?? ""}|${cat ?? ""}`}
      fallback={<PageSkeleton />}
    >
      <ProductsContent q={q} platform={platform} cat={cat} />
    </Suspense>
  );
}

async function ProductsContent({
  q,
  platform: platformParam,
  cat,
}: {
  q?: string;
  platform?: string;
  cat?: string;
}) {
  const lang = await getLang();
  const query = q?.trim() ?? "";

  // URL-də platforma yoxdursa, istifadəçinin seçimi cookie-dən götürülür —
  // beləliklə səhifə yenilənəndə başlıqdakı seçim və məhsullar UYĞUN qalır.
  const platform = platformParam ?? (await getPlatform());

  const [categoryRows, brands] = await Promise.all([
    getCategoriesForHome(lang),
    getBrands(platform),
  ]);

  // CANLI AXTARIŞ: sorğu + konkret platforma varsa əvvəlcə Partzona-dan çəkilir,
  // AI ilə çincəyə tərcümə olunur, DB-yə upsert edilir (dublikatsız), sonra
  // həmin məhsullar platformanın sırası ilə göstərilir (qayda #2 — yalnız backend).
  // Platforma seçilməyibsə ("all" və ya boş) də canlı axtarış işləsin —
  // yalnız 1688-in normalizer-i hazırdır, ona görə default odur.
  const importPlatform = platform && platform !== "all" ? platform : "1688";

  let products: ProductDTO[] = [];

  if (query) {
    const live = await importPartzonaSearch({
      query,
      lang,
      platform: importPlatform,
    });
    if (live.productIds.length > 0) {
      products = await getProductsByIds(live.productIds, lang);
    }
  } else if (cat) {
    // KATEQORİYA BAXIŞI: `/categories/{id}/products` yalnız offerId verir,
    // detallar ayrıca çəkilib DB-yə yazılır (keşli) — sonra sıra ilə göstərilir.
    const live = await importPartzonaCategory({
      categoryId: cat,
      platform: importPlatform,
      lang,
    });
    if (live.productIds.length > 0) {
      products = await getProductsByIds(live.productIds, lang);
    }
  }

  // Canlı nəticə yoxdursa (icazə yoxdur / xəta / boş) — DB kataloqundan göstər.
  if (products.length === 0) {
    if (query) {
      // İlk səhifə YALNIZ PAGE_SIZE qədər — qalanını sonsuz scroll gətirir.
      // Əvvəl bütün kataloq (2500+ məhsul) bir səhifədə render olunurdu.
      products = await searchProducts({ lang, query, platform, take: PAGE_SIZE });
    } else if (cat) {
      products = await getProductsByIds(await dbCategoryProductIds(cat), lang);
    } else {
      products = await getProducts({ lang, platform, take: PAGE_SIZE });
    }
  }

  const categories = categoryRows.map((c) => ({ key: c.key, name: c.name }));

  // Kateqoriya baxışında sol panel — alt (və ya qardaş) kateqoriyalar DB-dən.
  const subcategories = cat
    ? (await getSidebarSubcategories(importPlatform, lang, cat)).map((s) => ({
        key: s.key,
        name: s.name,
        href: s.href,
      }))
    : [];

  // Kateqoriya baxışında breadcrumb struktur datası (axtarış səhifəsi
  // indekslənmədiyi üçün orada breadcrumb yazmırıq).
  const t = dict[lang];
  const categorySeo =
    !query && cat
      ? await getPlatformCategorySeo(importPlatform, cat, lang)
      : null;

  return (
    <>
      {categorySeo && (
        <JsonLd
          data={breadcrumbLd([
            { name: t.seo.breadcrumbHome, url: "/" },
            { name: t.pages.categories, url: "/categories" },
            {
              name: categorySeo.name,
              url: categoryHref(importPlatform, cat!),
            },
          ])}
        />
      )}
      <ProductsFilter
        products={products}
        categories={categories}
        brands={brands}
        subcategories={subcategories}
      />
    </>
  );
}
