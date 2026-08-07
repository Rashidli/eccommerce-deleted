import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { variantLabelsFromSku } from "@/lib/purchase/variant-lookup";
import { formatDateTime, formatMoney } from "@/lib/format";
import { Badge, Card, PageHeader, STATUS_LABELS } from "@/components/admin/ui";
import { Field, Select } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/form-actions";
import { updateOrder } from "../actions";
import { CourierSelect } from "./courier-select";
import { getCouriers } from "@/lib/couriers";
import { OrderItemRow } from "./item-row";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const couriers = await getCouriers();
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true } },
      items: {
        // `attributes`/`raw` variantı SKU-dan bərpa etmək üçün lazımdır —
        // köhnə sətirlərdə ölçü/rəng saxlanmayıb.
        include: {
          product: { select: { image: true, attributes: true, raw: true } },
        },
        orderBy: { name: "asc" },
      },
      // Ödəniş cəhdləri — ən yenisi üstdə (uğursuz cəhdlər də tarixçədə qalır).
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  // VARİANTIN BƏRPASI.
  //
  // Köhnə sifariş sətirlərində `size`/`color` boşdur (o vaxt saxlanmırdı),
  // amma məlumat itməyib: SKU məhsulun `raw` cavabındakı variant ağacında
  // durur. Alış job-u onu məhz belə tapır — operator da eyni məlumatı
  // görməlidir, yoxsa "variant seçilməyib" yanlış həyəcan yaradır.
  const items = order.items.map((item) => {
    if (item.size || item.color) return { ...item, resolved: null };
    const found = variantLabelsFromSku(
      item.product?.attributes,
      item.product?.raw,
      item.sku,
    );
    return {
      ...item,
      resolved: found.size || found.color ? { size: found.size, color: found.color } : null,
    };
  });

  return (
    <>
      <PageHeader
        title={order.reference}
        subtitle={`Yaradılıb: ${formatDateTime(order.createdAt)}`}
        action={<Badge status={order.status} />}
      />

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
            Məhsullar
          </h2>
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <OrderItemRow
                key={item.id}
                orderId={order.id}
                item={{ ...item, image: item.product?.image ?? null }}
              />
            ))}
          </ul>
          <div className="space-y-1 border-t border-border px-4 py-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Çatdırılma</span>
              <span>{formatMoney(order.shippingCents)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-brand-ink">Yekun</span>
              <span className="text-lg font-bold text-brand-ink">
                {formatMoney(order.totalCents)}
              </span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {/* Ödəniş — operator alışa BAŞLAMAZDAN əvvəl buranı yoxlamalıdır. */}
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-brand-ink">Ödəniş</h2>

            <div className="flex items-center justify-between">
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${
                  order.isPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {order.isPaid ? "Ödənilib" : "Ödənilməyib"}
              </span>
              {order.paidAt && (
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(order.paidAt)}
                </span>
              )}
            </div>

            {order.payments.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-border pt-3">
                {order.payments.map((p) => (
                  <li key={p.id} className="text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-foreground">
                        {p.reference}
                      </span>
                      <span className="font-medium text-muted-foreground">
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-muted-foreground">
                      <span>
                        {p.provider} · {formatMoney(p.amountCents)}
                      </span>
                      <span>{formatDateTime(p.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Ödəniş cəhdi yoxdur
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-brand-ink">Müştəri</h2>
            {order.user ? (
              <div className="space-y-1 text-sm">
                <Link
                  href={`/admin/users/${order.user.id}`}
                  className="block font-medium text-brand hover:underline"
                >
                  {order.user.fullName}
                </Link>
                <p className="text-muted-foreground">{order.user.email}</p>
                <p className="text-muted-foreground">{order.user.phone ?? "—"}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Qonaq sifarişi</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-brand-ink">Çatdırılma</h2>
            <form action={updateOrder} className="space-y-4">
              <input type="hidden" name="id" value={order.id} />

              <Select
                name="status"
                label="Status"
                defaultValue={order.status}
                options={Object.entries(STATUS_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
              <CourierSelect
                defaultCourier={order.courier}
                defaultBranch={order.branch}
                couriers={couriers}
              />
              <Field name="tracking" label="İzləmə nömrəsi" defaultValue={order.tracking} />

              <SubmitButton>Yenilə</SubmitButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
