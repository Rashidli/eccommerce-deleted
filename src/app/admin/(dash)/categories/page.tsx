import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/form-actions";
import { VisibilityToggle } from "../platforms/toggle";
import { deleteCategory } from "./actions";

/**
 * KATEQORİYALAR — İKİ FƏRQLİ ŞEY, BİR SƏHİFƏDƏ AYRI-AYRI.
 *
 *   · "E-Commerce" — bizim ÖZ kateqoriyalarımız (`Category`): slug-ları var,
 *     storefront URL-lərini onlar qurur, məhsullar onlara bağlanır.
 *   · Platforma kateqoriyaları (`PlatformCategory`) — 1688 / Taobao / Zara
 *     ağacları. Onlar bizim deyil, mənbədən gəlir; redaktə olunmur, yalnız
 *     görünmə bayraqları və sırası bizimdir.
 *
 * Əvvəl bu səhifə yalnız birincini göstərirdi, platforma ağacları isə tamam
 * başqa yerdə (`/admin/platforms/[key]`) idi — "kateqoriyalar" deyəndə adam
 * hansını nəzərdə tutduğunu tapa bilmirdi. İndi hamısı burada, platforma
 * üzrə ayrılmış vəziyyətdə.
 */

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("categories");

  const { platform = "" } = await searchParams;

  // Platforma siyahısı BAZADAN — kodda sabit deyil (qayda #4).
  const platforms = await prisma.platform.findMany({
    orderBy: { sortOrder: "asc" },
    select: { key: true, nameAz: true, isActive: true },
  });

  const active = platforms.some((p) => p.key === platform) ? platform : "";

  // Hər bölmənin say göstəricisi — nişanların üstündə görünür.
  const counts = await prisma.platformCategory.groupBy({
    by: ["platformKey"],
    where: { parentExternalId: "0" },
    _count: { _all: true },
  });
  const countBy = new Map(counts.map((c) => [c.platformKey, c._count._all]));

  const ownCount = await prisma.category.count();

  const tabs = [
    { key: "", label: "E-Commerce", count: ownCount },
    ...platforms.map((p) => ({
      key: p.key,
      label: p.nameAz,
      count: countBy.get(p.key) ?? 0,
    })),
  ];

  return (
    <>
      <PageHeader
        title="Kateqoriyalar"
        subtitle={
          active
            ? "Platformadan gələn ağac — adlar mənbədən gəlir, görünmə bizimdir"
            : "Bizim öz kateqoriyalarımız — storefront URL-lərini bunlar qurur"
        }
        action={
          active ? undefined : (
            <PrimaryLink href="/admin/categories/new">
              <Plus className="h-4 w-4" />
              Yeni kateqoriya
            </PrimaryLink>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key || "own"}
            href={t.key ? `/admin/categories?platform=${t.key}` : "/admin/categories"}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active === t.key
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            {t.label}
            <span className="ml-1.5 opacity-70">{t.count}</span>
          </Link>
        ))}
      </div>

      {active ? (
        <PlatformCategories platformKey={active} />
      ) : (
        <OwnCategories />
      )}
    </>
  );
}

/** Bizim öz kateqoriyalarımız — tam CRUD. */
async function OwnCategories() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <Card>
      {categories.length === 0 ? (
        <EmptyState>Hələ kateqoriya yoxdur.</EmptyState>
      ) : (
        <Table head={["Sıra", "Ad (AZ)", "Slug", "Məhsul", ""]}>
          {categories.map((category) => (
            <tr key={category.id} className="hover:bg-secondary/50">
              <Td className="text-muted-foreground">{category.sortOrder}</Td>
              <Td>
                <Link
                  href={`/admin/categories/${category.id}`}
                  className="font-medium text-brand-ink hover:text-brand"
                >
                  {category.nameAz}
                </Link>
                <span className="block text-xs text-muted-foreground">
                  {category.nameEn} · {category.nameRu}
                </span>
              </Td>
              <Td className="font-mono text-xs text-muted-foreground">
                {category.slug}
              </Td>
              <Td className="text-muted-foreground">{category._count.products}</Td>
              <Td className="text-right">
                <DeleteButton action={deleteCategory} id={category.id} compact />
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}

/**
 * Platformanın ƏSAS kateqoriyaları.
 *
 * Silmə YOXDUR: bu sətirlər mənbədən gəlir və növbəti sinxronizasiyada
 * geri qayıdır. Bizim əlimizdə olan şey görünmədir — nav zolağı və ana
 * səhifə bayraqları AYRIDIR (biri digərini nəzərdə tutmur).
 */
async function PlatformCategories({ platformKey }: { platformKey: string }) {
  const [categories, subCounts] = await Promise.all([
    prisma.platformCategory.findMany({
      where: { platformKey, parentExternalId: "0" },
      orderBy: [{ sortOrder: "asc" }, { externalId: "asc" }],
    }),
    prisma.platformCategory.groupBy({
      by: ["parentExternalId"],
      where: { platformKey, parentExternalId: { not: "0" } },
      _count: { _all: true },
    }),
  ]);

  const subBy = new Map(subCounts.map((s) => [s.parentExternalId ?? "", s._count._all]));

  return (
    <Card>
      {categories.length === 0 ? (
        <EmptyState>
          Bu platformanın kateqoriyası yoxdur — əvvəlcə sinxronizasiya lazımdır.
        </EmptyState>
      ) : (
        <Table head={["", "Ad", "Alt kateq.", "Nav zolağı", "Ana səhifə", "ID"]}>
          {categories.map((c) => (
            <tr key={c.id} className="hover:bg-secondary/50">
              <Td>
                <span className="relative block h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                  {c.image && (
                    <Image
                      src={c.image}
                      alt={c.nameAz ?? c.externalId}
                      fill
                      sizes="40px"
                      className="object-contain p-1"
                    />
                  )}
                </span>
              </Td>
              <Td>
                <span className="font-medium text-foreground">
                  {c.nameAz ?? c.nameEn ?? c.externalId}
                </span>
                {c.nameZh && (
                  <span className="ml-2 text-xs text-muted-foreground">{c.nameZh}</span>
                )}
              </Td>
              <Td className="text-muted-foreground">{subBy.get(c.externalId) ?? 0}</Td>
              <Td>
                <VisibilityToggle
                  id={c.id}
                  field="showInNav"
                  checked={c.showInNav}
                  label={`${c.nameAz} nav zolağında`}
                />
              </Td>
              <Td>
                <VisibilityToggle
                  id={c.id}
                  field="showOnHome"
                  checked={c.showOnHome}
                  label={`${c.nameAz} ana səhifədə`}
                />
              </Td>
              <Td className="font-mono text-xs text-muted-foreground">{c.externalId}</Td>
            </tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
