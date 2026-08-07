import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { saveShippingRule } from "./actions";
import { enabledPlatformKeyWhere } from "@/lib/platform-visibility";

// Platforma ÇATDIRILMA tarifləri.
//
// Niyə tarif lazımdır: platformalar həmişə qiymət vermir —
//  · Zara → öz API-si real qiymət verir, tarif İŞLƏNMİR;
//  · 1688 → yalnız ÇƏKİ/ÖLÇÜ verir, qiymət yox → çəki × tarif;
//  · Taobao → `orders/render` preview-i token icazəsi tələb edir (403) →
//    hazırda yalnız tarif; icazə veriləndən sonra API-yə keçiriləcək.

export const metadata = { robots: { index: false, follow: false } };

const money = (cents: number) => (cents / 100).toFixed(2);

export default async function AdminShippingPage() {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("delivery");

  const [platforms, rules] = await Promise.all([
    prisma.platform.findMany({
      where: { isActive: true, ...enabledPlatformKeyWhere() },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.platformShippingRule.findMany(),
  ]);
  const byKey = new Map(rules.map((r) => [r.platformKey, r]));

  return (
    <>
      <PageHeader
        title="Çatdırılma tarifləri"
        subtitle="Platformanın öz API-si qiymət vermirsə, çatdırılma bu tariflə hesablanır"
      />

      <div className="space-y-4">
        {platforms.map((p) => {
          const r = byKey.get(p.key);
          // Zara real API qiyməti verir — tarif yalnız ehtiyatdır.
          const usesApi = p.key === "zara";

          return (
            <Card key={p.key}>
              <form action={saveShippingRule} className="space-y-4 p-4">
                <input type="hidden" name="platformKey" value={p.key} />

                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {p.nameAz}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      {p.key}
                    </span>
                  </h3>
                  {usesApi && (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                      API qiyməti işlənir
                    </span>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Field
                    label="Sabit hissə"
                    name="base"
                    defaultValue={money(r?.baseCents ?? 0)}
                  />
                  <Field
                    label="Kq başına"
                    name="perKg"
                    defaultValue={money(r?.perKgCents ?? 0)}
                  />
                  <Field
                    label="Ehtiyat çəki (q)"
                    name="fallbackWeightGrams"
                    defaultValue={String(r?.fallbackWeightGrams ?? 500)}
                  />
                  <Field
                    label="Pulsuz hədd"
                    name="freeOver"
                    defaultValue={r?.freeOverCents != null ? money(r.freeOverCents) : ""}
                    placeholder="boş = heç vaxt"
                  />
                  <Field
                    label="Valyuta"
                    name="currency"
                    defaultValue={r?.currency ?? "CNY"}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={r?.isActive ?? true}
                      className="h-4 w-4 rounded border-border"
                    />
                    Aktiv
                  </label>

                  <button
                    type="submit"
                    className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                  >
                    Yadda saxla
                  </button>
                </div>
              </form>
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
    </label>
  );
}
