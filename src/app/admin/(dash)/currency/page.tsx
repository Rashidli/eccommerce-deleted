import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format";
import {
  saveCurrencySettings,
  saveExchangeRate,
  deleteExchangeRate,
} from "./actions";
import { DISABLED_PLATFORMS } from "@/lib/platform-visibility";

/**
 * VALYUTA — göstəriş valyutası, marja və məzənnələr.
 *
 * ÖNƏMLİ: buradakı çevirmə YALNIZ GÖSTƏRİŞ üçündür. Sifariş, çatdırılma və
 * ödəniş həmişə platformanın öz valyutasında saxlanılır — çevrilmiş rəqəm
 * heç vaxt bazaya yazılmır və heç vaxt müştəridən tutulan məbləğ olmur.
 */

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminCurrencyPage() {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("settings");

  const [settings, rates, platforms] = await Promise.all([
    prisma.currencySettings.findUnique({ where: { id: "default" } }),
    prisma.exchangeRate.findMany({ orderBy: [{ base: "asc" }, { quote: "asc" }] }),
    prisma.platform.findMany({
      where: { isActive: true, key: { notIn: [...DISABLED_PLATFORMS] } },
      select: { key: true, currency: true },
    }),
  ]);

  const display = settings?.displayCurrency ?? "";
  const markupPct = ((settings?.markupBps ?? 0) / 100).toFixed(2);

  // Aktiv platformaların valyutaları — admin hansı cütləri yazmalı olduğunu görsün.
  const sourceCurrencies = [...new Set(platforms.map((p) => p.currency))].sort();
  const missing = display
    ? sourceCurrencies.filter(
        (c) =>
          c !== display &&
          !rates.some(
            (r) =>
              (r.base === c && r.quote === display) ||
              (r.base === display && r.quote === c),
          ),
      )
    : [];

  return (
    <>
      <PageHeader
        title="Valyuta"
        subtitle="Göstəriş valyutası, marja və məzənnələr — çevirmə yalnız görüntü üçündür"
      />

      <div className="space-y-4">
        <Card>
          <form action={saveCurrencySettings} className="space-y-4 p-4">
            <h3 className="font-semibold text-foreground">Göstəriş ayarı</h3>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Göstəriş valyutası (boş = çevirmə yoxdur)
                </span>
                <input
                  name="displayCurrency"
                  defaultValue={display}
                  placeholder="AZN"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Marja (%)
                </span>
                <input
                  name="markupPct"
                  defaultValue={markupPct}
                  placeholder="2.5"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              Boş buraxılsa hər məhsul öz valyutasında görünür (defolt davranış).
              Valyuta yazılsa, məzənnəsi olan məbləğlər «≈» işarəsi ilə çevrilir;
              məzənnə yoxdursa məbləğ olduğu kimi qalır — təxmin edilmir.
            </p>

            <button
              type="submit"
              className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
            >
              Yadda saxla
            </button>
          </form>
        </Card>

        {missing.length > 0 && (
          <Card>
            <p className="p-4 text-sm text-amber-700">
              Bu valyutaların <strong>{display}</strong>-ə məzənnəsi yoxdur:{" "}
              <strong>{missing.join(", ")}</strong>. Həmin məhsullar çevrilməyəcək,
              öz valyutasında görünəcək.
            </p>
          </Card>
        )}

        <Card>
          <form action={saveExchangeRate} className="space-y-3 p-4">
            <h3 className="font-semibold text-foreground">Məzənnə əlavə et / yenilə</h3>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Mənbə
                </span>
                <input
                  name="base"
                  placeholder="CNY"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Hədəf
                </span>
                <input
                  name="quote"
                  placeholder="AZN"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  1 mənbə = ? hədəf
                </span>
                <input
                  name="rate"
                  placeholder="0.2380"
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="cursor-pointer rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
                >
                  Yadda saxla
                </button>
              </div>
            </div>
          </form>
        </Card>

        <Card>
          {rates.length === 0 ? (
            <EmptyState>Məzənnə yoxdur — çevirmə işləmir.</EmptyState>
          ) : (
            <Table head={["Cüt", "Məzənnə", "Mənbə", "Yeniləndi", ""]}>
              {rates.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <span className="font-semibold">
                      {r.base} → {r.quote}
                    </span>
                  </Td>
                  <Td>{r.rate}</Td>
                  <Td className="text-muted-foreground">{r.source}</Td>
                  <Td className="text-muted-foreground">
                    {formatDateTime(r.fetchedAt)}
                  </Td>
                  <Td>
                    <form action={deleteExchangeRate}>
                      <input type="hidden" name="id" value={r.id} />
                      <button
                        type="submit"
                        className="cursor-pointer text-sm text-destructive hover:underline"
                      >
                        Sil
                      </button>
                    </form>
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
