import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, PrimaryLink, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";
import { DeleteButton } from "@/components/admin/form-actions";
import { deletePromoCode } from "./actions";

const PAGE_SIZE = 50;

export default async function AdminPromoCodesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("marketing");

  const { page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  const [total, codes] = await Promise.all([
    prisma.promoCode.count(),
    prisma.promoCode.findMany({
    orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Promo kodlar"
        subtitle={`${total} kod`}
        action={
          <PrimaryLink href="/admin/promo-codes/new">
            <Plus className="h-4 w-4" />
            Yeni kod
          </PrimaryLink>
        }
      />

      <Card>
        {codes.length === 0 ? (
          <EmptyState>Hələ promo kod yoxdur.</EmptyState>
        ) : (
          <Table
            head={["Kod", "Endirim", "Min. sifariş", "İstifadə", "Bitir", "Status", ""]}
          >
            {codes.map((code) => (
              <tr key={code.id} className="hover:bg-secondary/50">
                <Td>
                  <Link
                    href={`/admin/promo-codes/${code.id}`}
                    className="font-mono font-semibold text-brand-ink hover:text-brand"
                  >
                    {code.code}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap font-medium">
                  {code.type === "percent"
                    ? `${code.value}%`
                    : formatMoney(code.value)}
                </Td>
                <Td className="text-muted-foreground">
                  {code.minOrderCents ? formatMoney(code.minOrderCents) : "—"}
                </Td>
                <Td className="text-muted-foreground">
                  {code.usedCount}
                  {code.usageLimit ? ` / ${code.usageLimit}` : ""}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(code.expiresAt)}
                </Td>
                <Td>
                  <Badge
                    status={code.isActive ? "active" : "inactive"}
                    label={code.isActive ? "Aktiv" : "Söndürülüb"}
                  />
                </Td>
                <Td className="text-right">
                  <DeleteButton action={deletePromoCode} id={code.id} compact />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Pagination page={current} pages={pages} basePath="/admin/promo-codes" />
    </>
  );
}
