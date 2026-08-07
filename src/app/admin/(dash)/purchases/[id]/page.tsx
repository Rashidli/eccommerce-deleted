import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, CircleAlert, MinusCircle, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { Field, TextArea } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/form-actions";
import {
  markPurchaseFailed,
  markPurchaseNeedsReview,
  markPurchasePaid,
} from "../actions";

/** Jurnal sətrinin nəticəsinə görə nişan — göz cədvəli tez oxusun deyə. */
function OutcomeIcon({ outcome }: { outcome: string }) {
  if (outcome === "ok") return <Check className="h-4 w-4 text-brand" />;
  if (outcome === "fail") return <X className="h-4 w-4 text-destructive" />;
  if (outcome === "skip") return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
  return <CircleAlert className="h-4 w-4 text-muted-foreground" />;
}

export default async function AdminPurchaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { error, ok } = await searchParams;

  const purchase = await prisma.platformOrder.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, fullName: true, email: true, customerCode: true } },
      items: { include: { order: { select: { reference: true } } } },
      logs: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!purchase) notFound();

  const open = purchase.status === "paying" || purchase.status === "needs_review";

  return (
    <>
      <PageHeader
        title={`Alış — ${purchase.user.fullName}`}
        subtitle={`${purchase.platformKey.toUpperCase()} · ${(purchase.totalCents / 100).toFixed(2)} ${purchase.currency} · ${formatDate(purchase.createdAt)}`}
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
          <Card>
            <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
              İcra jurnalı
            </h2>
            {purchase.logs.length === 0 ? (
              <EmptyState>Bu alış üçün jurnal yazısı yoxdur.</EmptyState>
            ) : (
              <ul className="divide-y divide-border">
                {purchase.logs.map((log) => (
                  <li key={log.id} className="flex gap-3 px-4 py-3 text-sm">
                    <span className="mt-0.5 shrink-0">
                      <OutcomeIcon outcome={log.outcome} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-brand-ink">{log.step}</p>
                      <p className="break-words text-muted-foreground">{log.message}</p>
                      {log.detail != null && (
                        <pre className="mt-1 overflow-x-auto rounded bg-secondary px-2 py-1 text-xs text-muted-foreground">
                          {JSON.stringify(log.detail)}
                        </pre>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="border-b border-border px-4 py-3 font-semibold text-brand-ink">
              Sətirlər
            </h2>
            {purchase.items.length === 0 ? (
              <EmptyState>Bu alışa sətir bağlanmayıb.</EmptyState>
            ) : (
              <Table head={["Məhsul", "Ölçü / rəng", "Say", "Sifariş"]}>
                {purchase.items.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/50">
                    <Td className="font-medium text-brand-ink">{item.name}</Td>
                    <Td className="text-muted-foreground">
                      {[item.size, item.color].filter(Boolean).join(" · ") || "—"}
                    </Td>
                    <Td className="text-muted-foreground">{item.quantity}</Td>
                    <Td className="text-muted-foreground">
                      {item.order?.reference ?? "—"}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-3 font-semibold text-brand-ink">Vəziyyət</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <Badge status={purchase.status} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Sifariş nömrəsi</dt>
                <dd className="font-mono text-xs">{purchase.externalOrderId ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Ödəniş başlayıb</dt>
                <dd>{purchase.paymentStartedAt ? formatDate(purchase.paymentStartedAt) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Alınıb</dt>
                <dd>{purchase.purchasedAt ? formatDate(purchase.purchasedAt) : "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Müştəri</dt>
                <dd>
                  <Link
                    href={`/admin/users/${purchase.user.id}`}
                    className="text-brand hover:underline"
                  >
                    {purchase.user.customerCode ?? purchase.user.fullName}
                  </Link>
                </dd>
              </div>
            </dl>
          </Card>

          {open ? (
            <>
              <Card className="p-4">
                <h2 className="mb-1 font-semibold text-brand-ink">Alınıb kimi bağla</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Zara hesabında sifarişi tapıb nömrəsini yazın. Sətirlər bu alışa
                  bağlanır və bir daha alınmır.
                </p>
                <form action={markPurchasePaid} className="space-y-3">
                  <input type="hidden" name="id" value={purchase.id} />
                  <Field
                    name="externalOrderId"
                    label="Zara sifariş nömrəsi"
                    required
                    placeholder="54812614502"
                  />
                  <SubmitButton>Alınıb kimi bağla</SubmitButton>
                </form>
              </Card>

              <Card className="p-4">
                <h2 className="mb-1 font-semibold text-brand-ink">Alınmadı</h2>
                <p className="mb-3 text-sm text-muted-foreground">
                  Yalnız Zara hesabında YOXLADIQDAN sonra. Sifariş əslində keçibsə,
                  bu, eyni malın ikinci dəfə alınmasına yol açar.
                </p>
                <form action={markPurchaseFailed} className="space-y-3">
                  <input type="hidden" name="id" value={purchase.id} />
                  <TextArea name="note" label="Qeyd" rows={2} />
                  <SubmitButton>Alınmadı işarələ</SubmitButton>
                </form>
              </Card>

              {purchase.status !== "needs_review" && (
                <Card className="p-4">
                  <h2 className="mb-1 font-semibold text-brand-ink">Yoxlanmalı</h2>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Dərhal qərar verə bilmirsinizsə. Job yenə dayanır, amma vəziyyət
                    açıq qeyd olunur.
                  </p>
                  <form action={markPurchaseNeedsReview} className="space-y-3">
                    <input type="hidden" name="id" value={purchase.id} />
                    <TextArea name="note" label="Qeyd" rows={2} />
                    <SubmitButton>Yoxlanmalı işarələ</SubmitButton>
                  </form>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-4">
              <p className="text-sm text-muted-foreground">
                Bu alış bağlıdır ({purchase.status}) — operator əməliyyatı lazım deyil.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
