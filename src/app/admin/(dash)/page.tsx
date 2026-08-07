import Link from "next/link";
import { AlertTriangle, Package, ShoppingBag, Users, Ticket, PackageSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Stat, Table, Td } from "@/components/admin/ui";

export default async function AdminDashboardPage() {
  const [
    productCount,
    orderCount,
    userCount,
    promoCount,
    revenue,
    recentOrders,
    toPurchase,
    blockedPurchases,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
    prisma.promoCode.count({ where: { isActive: true } }),
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { status: { not: "cancelled" } },
    }),
    prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { fullName: true } } },
    }),
    // Dropshipping: stok yoxdur — operatorun tədarükçüdən alması gözlənən sətirlər.
    prisma.orderItem.findMany({
      where: {
        purchasedAt: null,
        order: { status: { notIn: ["delivered", "cancelled"] } },
      },
      take: 6,
      orderBy: { order: { createdAt: "asc" } },
      select: {
        id: true,
        name: true,
        quantity: true,
        order: { select: { id: true, reference: true } },
      },
    }),
    // Nəticəsi bilinməyən alışlar — job bu vəziyyətdə ümumiyyətlə işləmir.
    prisma.platformOrder.count({ where: { status: { in: ["paying", "needs_review"] } } }),
  ]);

  return (
    <>
      <PageHeader
        title="İdarə paneli"
        subtitle="Mağazanın ümumi vəziyyəti"
      />

      {/* BLOKLANMIŞ ALIŞ — ən yuxarıda, çünki bu hal avto-alışı TAMAMİLƏ
          dayandırır və heç bir yerdə səs çıxarmır. Operator paneli açmasa,
          sifarişlər səssizcə gözləyər. */}
      {blockedPurchases > 0 && (
        <Link
          href="/admin/purchases?status=paying"
          className="mb-4 flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm transition-colors hover:bg-destructive/15"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <span>
            <span className="block font-medium text-destructive">
              {blockedPurchases} alışın nəticəsi məlum deyil — avto-alış dayanıb.
            </span>
            <span className="text-muted-foreground">
              Nəticəsi bilinməyən alışı avtomatik təkrarlamaq eyni malı iki dəfə
              almaq deməkdir. Zara hesabında yoxlayıb bağlayın.
            </span>
          </span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Ümumi dövriyyə"
          value={formatMoney(revenue._sum.totalCents ?? 0)}
          icon={<ShoppingBag className="h-5 w-5" />}
          href="/admin/orders"
        />
        <Stat
          label="Sifarişlər"
          value={String(orderCount)}
          icon={<ShoppingBag className="h-5 w-5" />}
          href="/admin/orders"
        />
        <Stat
          label="Məhsullar"
          value={String(productCount)}
          icon={<Package className="h-5 w-5" />}
          href="/admin/products"
        />
        <Stat
          label="İstifadəçilər"
          value={String(userCount)}
          icon={<Users className="h-5 w-5" />}
          href="/admin/users"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="font-semibold text-brand-ink">Son sifarişlər</h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-brand hover:underline"
            >
              Hamısı
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState>Hələ sifariş yoxdur.</EmptyState>
          ) : (
            <Table head={["Sifariş", "Müştəri", "Tarix", "Status", "Məbləğ"]}>
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-secondary/50">
                  <Td>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-brand hover:underline"
                    >
                      {order.reference}
                    </Link>
                  </Td>
                  <Td className="text-muted-foreground">
                    {order.user?.fullName ?? "Qonaq"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </Td>
                  <Td>
                    <Badge status={order.status} />
                  </Td>
                  <Td className="font-semibold text-brand-ink">
                    {formatMoney(order.totalCents)}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 text-brand" />
              <h2 className="font-semibold text-brand-ink">Aktiv promo kod</h2>
            </div>
            <p className="mt-2 text-3xl font-bold text-brand-ink">
              {promoCount}
            </p>
            <Link
              href="/admin/promo-codes"
              className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
            >
              İdarə et
            </Link>
          </Card>

          <Card>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <PackageSearch className="h-4 w-4 text-amber-600" />
              <h2 className="font-semibold text-brand-ink">Alınmalı məhsullar</h2>
            </div>
            {toPurchase.length === 0 ? (
              <EmptyState>Gözləyən alış yoxdur.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {toPurchase.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/admin/orders/${item.order.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-secondary/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-brand-ink">
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.order.reference}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-amber-700">
                        ×{item.quantity}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
