import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Badge, Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";
import { DeleteButton } from "@/components/admin/form-actions";
import { deleteCampaign } from "./actions";

const PAGE_SIZE = 50;

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("marketing");

  const { page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  // Kampaniyalar arxivə yığılır — siyahı səhifələnir.
  const [total, campaigns] = await Promise.all([
    prisma.campaign.count(),
    prisma.campaign.findMany({
    orderBy: { sortOrder: "asc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Kampaniyalar"
        subtitle="Ana səhifədəki promo blokları"
        action={
          <PrimaryLink href="/admin/campaigns/new">
            <Plus className="h-4 w-4" />
            Yeni kampaniya
          </PrimaryLink>
        }
      />

      <Card>
        {campaigns.length === 0 ? (
          <EmptyState>Hələ kampaniya yoxdur.</EmptyState>
        ) : (
          <Table head={["Sıra", "Kampaniya", "Keçid", "Status", ""]}>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-secondary/50">
                <Td className="text-muted-foreground">{campaign.sortOrder}</Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={campaign.image}
                      alt=""
                      className="h-11 w-16 shrink-0 rounded-lg bg-secondary object-cover"
                    />
                    <span className="min-w-0">
                      <Link
                        href={`/admin/campaigns/${campaign.id}`}
                        className="block truncate font-medium text-brand-ink hover:text-brand"
                      >
                        {campaign.titleAz}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {campaign.eyebrowAz}
                      </span>
                    </span>
                  </div>
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {campaign.href}
                </Td>
                <Td>
                  <Badge
                    status={campaign.isActive ? "active" : "inactive"}
                    label={campaign.isActive ? "Aktiv" : "Gizli"}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton action={deleteCampaign} id={campaign.id} compact />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Pagination page={current} pages={pages} basePath="/admin/campaigns" />
    </>
  );
}
