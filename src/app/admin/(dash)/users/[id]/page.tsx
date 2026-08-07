import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { Field } from "@/components/admin/fields";
import { DeleteButton, SubmitButton } from "@/components/admin/form-actions";
import {
  deleteUser,
  revokeUserSessions,
  setUserPassword,
  updateUser,
} from "../actions";
import { UserForm } from "../user-form";

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      addresses: true,
      orders: { orderBy: { createdAt: "desc" } },
      sessions: { orderBy: { createdAt: "desc" } },
      platformOrders: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });

  if (!user) notFound();

  const spent = user.orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <>
      <PageHeader
        title={user.fullName}
        subtitle={`${user.email} · ${user.orders.length} sifariş · ${formatMoney(spent)}`}
      />

      {error && (
        <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {ok && (
        <p className="mb-4 rounded-lg border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand-ink">
          Yadda saxlanıldı.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <UserForm action={updateUser} user={user} />

          <Card>
            <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
              Sifarişlər
            </h2>
            {user.orders.length === 0 ? (
              <EmptyState>Bu istifadəçinin sifarişi yoxdur.</EmptyState>
            ) : (
              <Table head={["Sifariş", "Tarix", "Status", "Məbləğ"]}>
                {user.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-secondary/50">
                    <Td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium text-brand hover:underline"
                      >
                        {order.reference}
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </Td>
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

          {user.platformOrders.length > 0 && (
            <Card>
              <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
                Platforma alışları
              </h2>
              <Table head={["Platforma", "Status", "Nömrə", "Məbləğ", "Tarix"]}>
                {user.platformOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-secondary/50">
                    <Td className="uppercase">{po.platformKey}</Td>
                    <Td>
                      <Badge status={po.status} />
                    </Td>
                    <Td className="font-mono text-xs text-muted-foreground">
                      {po.externalOrderId ?? "—"}
                    </Td>
                    <Td className="whitespace-nowrap">{formatMoney(po.totalCents)}</Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {formatDate(po.createdAt)}
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-brand-ink">Şifrə</h2>
            {/* Ayrıca formadır: əsas formada olsaydı hər "yadda saxla"
                təsadüfən şifrəni sıfırlaya bilərdi. */}
            <form action={setUserPassword} className="space-y-3">
              <input type="hidden" name="id" value={user.id} />
              <Field
                name="password"
                label="Yeni şifrə"
                type="password"
                required
                hint="Ən azı 6 simvol. Dəyişəndə bütün sessiyalar bağlanır."
              />
              <SubmitButton>Şifrəni təyin et</SubmitButton>
            </form>
            <p className="mt-3 text-xs text-muted-foreground">
              Cari vəziyyət: {user.password ? "şifrə təyin olunub" : "şifrə yoxdur"}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="mb-1 font-semibold text-brand-ink">Sessiyalar</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              {user.sessions.length} açıq sessiya
            </p>
            {user.sessions.length > 0 && (
              <form action={revokeUserSessions}>
                <input type="hidden" name="id" value={user.id} />
                <SubmitButton>Hamısını bağla</SubmitButton>
              </form>
            )}
          </Card>

          <Card>
            <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
              Ünvanlar
            </h2>
            {user.addresses.length === 0 ? (
              <EmptyState>Ünvan əlavə olunmayıb.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {user.addresses.map((address) => (
                  <li key={address.id} className="flex gap-3 px-4 py-3 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div className="min-w-0">
                      <p className="font-medium text-brand-ink">
                        {address.label}
                        {address.isDefault && (
                          <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand">
                            Əsas
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground">{address.line}</p>
                      <p className="text-xs text-muted-foreground">
                        {address.fullName} · {address.phone}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-1 font-semibold text-brand-ink">Hesabı sil</h2>
            <p className="mb-3 text-sm text-muted-foreground">
              Sifarişi olan hesab silinmir — sifariş tarixçəsi sahibsiz qalmamalıdır.
            </p>
            <DeleteButton action={deleteUser} id={user.id} />
          </Card>
        </div>
      </div>
    </>
  );
}
