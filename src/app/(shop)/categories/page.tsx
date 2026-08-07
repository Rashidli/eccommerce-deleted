import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { JsonLd, breadcrumbLd, alternatesFor } from "@/lib/seo/jsonld";
import {
  getCategoriesForHome,
  getActivePlatforms,
  getPlatformCategories,
} from "@/lib/data/catalog";
import { CategoriesGrid } from "./categories-grid";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  const t = dict[lang];
  return {
    title: t.seo.categoriesTitle,
    description: t.seo.categoriesDescription,
    alternates: alternatesFor("/categories"),
    openGraph: {
      type: "website",
      title: t.seo.categoriesTitle,
      description: t.seo.categoriesDescription,
      url: "/categories",
    },
  };
}

// Kateqoriyalar — tamamilə DB-dən və seçilmiş platformaya görə (qayda #4).
export default async function CategoriesPage() {
  const lang = await getLang();
  const t = dict[lang];

  const [categories, platforms] = await Promise.all([
    getCategoriesForHome(lang),
    getActivePlatforms(lang),
  ]);

  // Bu səhifədə ana səhifədən fərqli olaraq BÜTÜN yuxarı səviyyə kateqoriyalar.
  const platformCategories = Object.fromEntries(
    await Promise.all(
      platforms.map(
        async (p) =>
          [p.key, await getPlatformCategories(p.key, lang, 200)] as const,
      ),
    ),
  );

  return (
    <PageShell title={t.pages.categories}>
      <JsonLd
        data={breadcrumbLd([
          { name: t.seo.breadcrumbHome, url: "/" },
          { name: t.pages.categories, url: "/categories" },
        ])}
      />
      <CategoriesGrid
        categories={categories}
        platformCategories={platformCategories}
      />
    </PageShell>
  );
}
