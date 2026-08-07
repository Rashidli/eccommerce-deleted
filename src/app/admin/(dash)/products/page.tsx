import Link from "next/link";
import { ExternalLink, Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";
import { DeleteButton } from "@/components/admin/form-actions";
import { deleteProduct } from "./actions";

const PAGE_SIZE = 50;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    source?: string;
    category?: string;
    status?: string;
    page?: string;
  }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("products");

  const {
    q = "",
    source = "",
    category = "",
    status = "",
    page = "1",
  } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  // SİYAHI SƏHİFƏLƏNİR — kataloqda minlərlə məhsul var.
  //
  // Əvvəl `findMany` süzgəcsiz idi: bütün kataloq (ölçüldü — 3787 sətir)
  // hər açılışda şəkilləri ilə birgə render olunurdu. Süzgəc və səhifələmə
  // indi Postgres-dədir.
  const where: Prisma.ProductWhereInput = {
    ...(source ? { source } : {}),
    ...(status === "active" ? { isActive: true } : {}),
    ...(status === "hidden" ? { isActive: false } : {}),
    ...(category ? { categoryId: category } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { nameAz: { contains: q, mode: "insensitive" } },
            { brand: { contains: q, mode: "insensitive" } },
            { sku: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, products, categories, sources] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { nameAz: true } } },
    }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, nameAz: true } }),
    // Mənbə siyahısı KODDA sabit deyil — bazada nə varsa o göstərilir.
    prisma.product.groupBy({ by: ["source"], _count: { _all: true } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <>
      <PageHeader
        title="Məhsullar"
        subtitle={
          q || source || category || status
            ? `${total} nəticə (səhifə ${current}/${pages})`
            : `${total} məhsul`
        }
        action={
          <PrimaryLink href="/admin/products/new">
            <Plus className="h-4 w-4" />
            Yeni məhsul
          </PrimaryLink>
        }
      />

      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Axtarış</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Ad, brend və ya SKU"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Mənbə</label>
            <select
              name="source"
              defaultValue={source}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Hamısı</option>
              {sources
                .filter((s) => s.source)
                .map((s) => (
                  <option key={s.source} value={s.source ?? ""}>
                    {s.source} ({s._count._all})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Kateqoriya</label>
            <select
              name="category"
              defaultValue={category}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Hamısı</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAz}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Status</label>
            <select
              name="status"
              defaultValue={status}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Hamısı</option>
              <option value="active">Aktiv</option>
              <option value="hidden">Gizli</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Süz
          </button>
          {(q || source || category || status) && (
            <Link
              href="/admin/products"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Təmizlə
            </Link>
          )}
        </form>
      </Card>

      <Card>
        {products.length === 0 ? (
          <EmptyState>
            {q || source || category || status
              ? "Süzgəcə uyğun məhsul tapılmadı."
              : "Hələ məhsul yoxdur."}
          </EmptyState>
        ) : (
          <Table head={["Məhsul", "Kateqoriya", "Qiymət", "Mənbə", "Status", ""]}>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-secondary/50">
                <Td>
                  <div className="flex items-center gap-3">
                    {/* Admin ixtiyari host-dan URL yapışdıra bilər — next/image
                        yalnız remotePatterns-dəki hostları qəbul edir. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-lg bg-secondary object-contain p-1"
                    />
                    <span className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="block truncate font-medium text-brand-ink hover:text-brand"
                      >
                        {product.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {product.brand}
                      </span>
                    </span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {product.category?.nameAz ?? "—"}
                </Td>
                <Td className="whitespace-nowrap font-semibold text-brand-ink">
                  {formatMoney(product.priceCents)}
                  {product.oldPriceCents && (
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">
                      {formatMoney(product.oldPriceCents)}
                    </span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {product.sourceUrl ? (
                    <a
                      href={product.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      {product.source ?? "Link"}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    (product.source ?? "—")
                  )}
                  {product.sku && (
                    <span className="block font-mono text-xs">{product.sku}</span>
                  )}
                </Td>
                <Td>
                  <Badge
                    status={product.isActive ? "active" : "inactive"}
                    label={product.isActive ? "Aktiv" : "Gizli"}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton action={deleteProduct} id={product.id} compact />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Pagination
        page={current}
        pages={pages}
        basePath="/admin/products"
        params={{ q, source, category, status }}
      />

    </>
  );
}
