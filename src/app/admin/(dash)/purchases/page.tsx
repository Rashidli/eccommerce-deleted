import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 50;

/** Platforma valyutası dollar deyil — məbləği öz valyutası ilə göstəririk. */
function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default async function AdminPurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("purchases");

  const { status = "", page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  const where: Prisma.PlatformOrderWhereInput = status ? { status } : {};

  const [total, purchases, pending] = await Promise.all([
    prisma.platformOrder.count({ where }),
    prisma.platformOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { fullName: true, customerCode: true } },
        _count: { select: { items: true } },
      },
    }),
    // Bu iki status job-u BLOKLAYIR — ən yuxarıda xəbərdarlıq kimi göstərilir.
    prisma.platformOrder.count({ where: { status: { in: ["paying", "needs_review"] } } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const FILTERS = [
    { value: "", label: "Hamısı" },
    { value: "paying", label: "Ödənilir" },
    { value: "needs_review", label: "Yoxlanmalı" },
    { value: "paid", label: "Alınıb" },
    { value: "failed", label: "Alınmadı" },
    { value: "planned", label: "Planlanıb" },
  ];

  return (
    <>
      <PageHeader
        title="Alışlar"
        subtitle={`${total} alış · platformadan avtomatik alınan sifarişlər`}
      />

      {pending > 0 && (
        <div className="mb-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {pending} alışın nəticəsi məlum deyil.
            </p>
            <p className="text-muted-foreground">
              Bu vəziyyət avto-alış job-unu tamamilə dayandırır — nəticəsi bilinməyən
              alışı avtomatik təkrarlamaq eyni malı iki dəfə almaq deməkdir. Zara
              hesabında yoxlayıb aşağıdan bağlayın.
            </p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value || "all"}
            href={f.value ? `/admin/purchases?status=${f.value}` : "/admin/purchases"}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              status === f.value
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card>
        {purchases.length === 0 ? (
          <EmptyState>
            {status ? "Bu statusda alış yoxdur." : "Hələ alış icra olunmayıb."}
          </EmptyState>
        ) : (
          <Table
            head={["Müştəri", "Platforma", "Status", "Sifariş nömrəsi", "Sətir", "Məbləğ", "Tarix"]}
          >
            {purchases.map((p) => (
              <tr key={p.id} className="hover:bg-secondary/50">
                <Td>
                  <Link
                    href={`/admin/purchases/${p.id}`}
                    className="font-medium text-brand-ink hover:text-brand"
                  >
                    {p.user.fullName}
                  </Link>
                  <span className="block font-mono text-xs text-muted-foreground">
                    {p.user.customerCode ?? "—"}
                  </span>
                </Td>
                <Td className="uppercase text-muted-foreground">{p.platformKey}</Td>
                <Td>
                  <Badge status={p.status} />
                </Td>
                <Td className="font-mono text-xs text-muted-foreground">
                  {p.externalOrderId ?? "—"}
                </Td>
                <Td className="text-muted-foreground">{p._count.items}</Td>
                <Td className="whitespace-nowrap font-semibold text-brand-ink">
                  {money(p.totalCents, p.currency)}
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(p.createdAt)}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Pagination
        page={current}
        pages={pages}
        basePath="/admin/purchases"
        params={{ status }}
      />

    </>
  );
}
