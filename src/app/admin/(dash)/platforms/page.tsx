import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { BadgeColorEditor, PlatformToggle } from "./toggle";

// Platformaların idarəetməsi — hansı platforma storefront-da işləsin.
// Deaktiv platforma axtarış seçicisində görünmür və import etmir (qayda #4:
// bu qərar kodda deyil, bazadadır).

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPlatformsPage() {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("platforms");

  const [platforms, categoryCounts, productCounts] = await Promise.all([
    prisma.platform.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.platformCategory.groupBy({
      by: ["platformKey"],
      _count: { _all: true },
    }),
    prisma.product.groupBy({ by: ["source"], _count: { _all: true } }),
  ]);

  const catBy = new Map(categoryCounts.map((c) => [c.platformKey, c._count._all]));
  const prodBy = new Map(productCounts.map((p) => [p.source, p._count._all]));

  return (
    <>
      <PageHeader
        title="Platformalar"
        subtitle={`${platforms.length} platforma · ${platforms.filter((p) => p.isActive).length} aktiv`}
      />

      <Card>
        {platforms.length === 0 ? (
          <EmptyState>Platforma yoxdur.</EmptyState>
        ) : (
          <Table
            head={["Platforma", "Provayder", "Valyuta", "Nişan", "Kateqoriya", "Məhsul", "Aktiv", ""]}
          >
            {platforms.map((p) => (
              <tr key={p.key}>
                <Td>
                  <span className="font-semibold text-foreground">{p.nameAz}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{p.key}</span>
                </Td>
                <Td className="text-muted-foreground">{p.provider}</Td>
                {/* Platformanın satış valyutası — məhsul importunda default
                    olaraq bu işlədilir (qayda #4: kodda sabit deyil). */}
                <Td>
                  <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
                    {p.currency}
                  </span>
                </Td>
                {/* Nişan rəngi — məhsul kartında hansı fonla görünəcəyi. */}
                <Td>
                  <BadgeColorEditor
                    platformKey={p.key}
                    label={p.nameEn || p.key}
                    initialBg={p.badgeBg ?? "#7c3aed"}
                    initialFg={p.badgeFg ?? "#ffffff"}
                  />
                </Td>
                <Td>{catBy.get(p.key) ?? 0}</Td>
                <Td>{prodBy.get(p.key) ?? 0}</Td>
                <Td>
                  <PlatformToggle
                    platformKey={p.key}
                    checked={p.isActive}
                    label={`${p.nameAz} aktiv`}
                  />
                </Td>
                <Td>
                  {(catBy.get(p.key) ?? 0) > 0 && (
                    <Link
                      href={`/admin/platforms/${p.key}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                      Kateqoriyalar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
