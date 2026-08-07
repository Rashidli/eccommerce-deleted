import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  PrimaryLink,
  Table,
  Td,
} from "@/components/admin/ui";
import { Pagination } from "@/components/admin/pagination";

const PAGE_SIZE = 50;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("users");

  const { q = "", role = "", page = "1" } = await searchParams;
  const current = Math.max(1, parseInt(page, 10) || 1);

  // FİLTRLƏR SORĞUDA, YADDAŞDA YOX.
  //
  // Əvvəl bütün istifadəçilər sifarişləri ilə birgə çəkilirdi. Baza böyüdükcə
  // bu, hər açılışda minlərlə sətir deməkdir. İndi süzgəc və səhifələmə
  // Postgres-də olur, xərclədiyi məbləğ isə aqreqasiya ilə hesablanır.
  const where: Prisma.UserWhereInput = {
    ...(role === "admin" || role === "customer" ? { role } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { customerCode: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { orders: true } } },
    }),
  ]);

  // Ləğv olunmuş sifarişlər xərcə sayılmır — pul geri qaytarılıb.
  const spentRows = users.length
    ? await prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: users.map((u) => u.id) }, status: { not: "cancelled" } },
        _sum: { totalCents: true },
      })
    : [];
  const spentByUser = new Map(spentRows.map((r) => [r.userId, r._sum.totalCents ?? 0]));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return (
    <>
      <PageHeader
        title="İstifadəçilər"
        subtitle={`${total} istifadəçi`}
        action={
          <PrimaryLink href="/admin/users/new">
            <Plus className="h-4 w-4" />
            Yeni istifadəçi
          </PrimaryLink>
        }
      />

      <Card className="mb-4 p-4">
        <form className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">
              Axtarış
            </label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Ad, e-poçt, telefon və ya müştəri kodu"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brand-ink">Rol</label>
            <select
              name="role"
              defaultValue={role}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
            >
              <option value="">Hamısı</option>
              <option value="customer">Müştəri</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            Süz
          </button>
          {(q || role) && (
            <Link
              href="/admin/users"
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground"
            >
              Təmizlə
            </Link>
          )}
        </form>
      </Card>

      <Card>
        {users.length === 0 ? (
          <EmptyState>
            {q || role ? "Süzgəcə uyğun istifadəçi tapılmadı." : "Hələ istifadəçi yoxdur."}
          </EmptyState>
        ) : (
          <Table
            head={["Ad", "Müştəri kodu", "E-poçt", "Telefon", "Sifariş", "Xərclədiyi", "Rol"]}
          >
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-secondary/50">
                <Td>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-medium text-brand-ink hover:text-brand"
                  >
                    {user.fullName}
                  </Link>
                  <span className="block text-xs text-muted-foreground">
                    Qeydiyyat: {formatDate(user.createdAt)}
                  </span>
                </Td>
                <Td className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                  {user.customerCode ?? "—"}
                </Td>
                <Td className="text-muted-foreground">{user.email}</Td>
                <Td className="text-muted-foreground">{user.phone ?? "—"}</Td>
                <Td className="text-muted-foreground">{user._count.orders}</Td>
                <Td className="whitespace-nowrap font-semibold text-brand-ink">
                  {formatMoney(spentByUser.get(user.id) ?? 0)}
                </Td>
                <Td>
                  <Badge
                    status={user.role === "admin" ? "active" : "inactive"}
                    label={user.role === "admin" ? "Admin" : "Müştəri"}
                  />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Pagination
        page={current}
        pages={pages}
        basePath="/admin/users"
        params={{ q, role }}
      />

    </>
  );
}
