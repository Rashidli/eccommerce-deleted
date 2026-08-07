import { PageShell } from "@/components/page-shell";
import { ProductGrid } from "@/components/product-grid";
import { dict } from "@/lib/i18n";
import { getLang } from "@/lib/server-lang";
import { getProductsByCategory } from "@/lib/data/catalog";

// Kateqoriya səhifəsi — DB-dən (slug-a görə). Başlıq i18n-dən (varsa), yoxsa slug.
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = rawSlug.toLowerCase();
  const lang = await getLang();
  const t = dict[lang];
  const products = await getProductsByCategory(slug, lang);
  const title = (t.cat as Record<string, string>)[slug] ?? slug;

  return (
    <PageShell
      title={title}
      subtitle={`${products.length} ${t.pages.productsFound}`}
    >
      <ProductGrid products={products} />
    </PageShell>
  );
}
