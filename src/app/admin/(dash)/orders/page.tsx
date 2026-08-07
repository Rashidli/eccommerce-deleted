import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getCouriers } from "@/lib/couriers";
import { Badge, Card, EmptyState, PageHeader, STATUS_LABELS, Table, Td } from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";

const STATUS_FILTERS = [
  { value: "", label: "Hamısı" },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const PAGE_SIZE = 50;

/** Mövcud filtrləri qoruyaraq yalnız bir parametri dəyişir. */
function filterHref(current: { status: string; courier: string }, patch: Partial<typeof current>) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.status) params.set("status", next.status);
  if (next.courier) params.set("courier", next.courier);
  const query = params.toString();
  return query ? `/admin/orders?${query}` : "/admin/orders";
}

function FilterRow({
  options,
  activeValue,
  hrefFor,
}: {
  options: { value: string; label: string }[];
  activeValue: string;
  hrefFor: (value: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Link
          key={option.value || "all"}
          href={hrefFor(option.value)}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeValue === option.value
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border text-foreground hover:bg-secondary"
          }`}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; courier?: string; q?: string; page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("orders");

  const { status, courier, q = "", page = "1" } = await searchParams;
  const pageNo = Math.max(1, parseInt(page, 10) || 1);

  // Kargo siyahısı BAZADAN — modul səviyyəsində sabit ola bilməz (async).
  const couriers = await getCouriers();
  const COURIER_FILTERS = [
    { value: "", label: "Bütün kargolar" },
    ...couriers.map((c) => ({ value: c.name, label: c.name })),
  ];
  const activeStatus = status && STATUS_LABELS[status] ? status : "";
  const activeCourier =
    courier && couriers.some((item) => item.name === courier) ? courier : "";
  const current = { status: activeStatus, courier: activeCourier };

  // AXTARIŞ + SƏHİFƏLƏMƏ — sifariş sayı vaxtla artır və filtrsiz siyahı
  // bütün cədvəli çəkir. Operator adətən konkret sifarişi axtarır: nömrə,
  // müştəri adı və ya e-poçt üzrə.
  const where = {
    ...(activeStatus ? { status: activeStatus } : {}),
    ...(activeCourier ? { courier: activeCourier } : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: "insensitive" as const } },
            { user: { fullName: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (pageNo - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { fullName: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Sifarişlər" subtitle={`${total} sifariş`} />

      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          {/* Cari filtrlər axtarışdan sonra da qalsın. */}
          {activeStatus && <input type="hidden" name="status" value={activeStatus} />}
          {activeCourier && <input type="hidden" name="courier" value={activeCourier} />}
          <div className="min-w-56 flex-1">
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Axtarış</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Sifariş nömrəsi, müştəri adı və ya e-poçt"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Axtar
          </button>
          {q && (
            <Link
              href={filterHref(current, {})}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Təmizlə
            </Link>
          )}
        </form>
      </Card>

      <div className="mb-4 space-y-2">
        <FilterRow
          options={STATUS_FILTERS}
          activeValue={activeStatus}
          hrefFor={(value) => filterHref(current, { status: value })}
        />
        <FilterRow
          options={COURIER_FILTERS}
          activeValue={activeCourier}
          hrefFor={(value) => filterHref(current, { courier: value })}
        />
      </div>

      <Card>
        {orders.length === 0 ? (
          <EmptyState>Bu filtrə uyğun sifariş yoxdur.</EmptyState>
        ) : (
          <Table head={["Sifariş", "Müştəri", "Tarix", "Kargo", "Məhsul", "Status", "Məbləğ"]}>
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-secondary/50">
                <Td>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {order.reference}
                  </Link>
                </Td>
                <Td>
                  <span className="block text-brand-ink">
                    {order.user?.fullName ?? "Qonaq"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {order.user?.email ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-muted-foreground">
                  {formatDate(order.createdAt)}
                </Td>
                <Td className="whitespace-nowrap">
                  <span className="block text-brand-ink">
                    {order.courier ?? "—"}
                  </span>
                  {order.branch && (
                    <span className="text-xs text-muted-foreground">
                      {order.branch}
                    </span>
                  )}
                </Td>
                <Td className="text-muted-foreground">{order._count.items}</Td>
                <Td>
                  <Badge status={order.status} />
                </Td>
                <Td className="whitespace-nowrap font-semibold text-brand-ink">
                  {formatMoney(order.totalCents)}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Pagination
        page={pageNo}
        pages={pages}
        basePath="/admin/orders"
        params={{ status: activeStatus, courier: activeCourier, q }}
      />

    </>
  );
}
