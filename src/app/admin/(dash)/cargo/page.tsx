import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { SITE_URL } from "@/lib/site-url";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { createCargoCompany, updateCargoCompany } from "./actions";
import { ActiveToggle, SyncBranchesButton } from "./controls";

/**
 * KARGO ŞİRKƏTLƏRİ — filiallar, API açarları, hadisə jurnalı.
 *
 * Bu səhifə `/admin/delivery`-dən AYRIDIR:
 *   · `/admin/delivery` → rayon tarifi və PUDO (müştəriyə göstərilən qiymət)
 *   · bu səhifə        → şirkətin özü ilə inteqrasiya (API, filial, status)
 *
 * SİRR QAYDASI: `apiToken` və `webhookSecret` bu səhifədə HEÇ VAXT oxunmur —
 * sorğuda `select` ilə kənarlaşdırılıb. Yalnız "var / yoxdur" göstərilir.
 * Beləcə admin HTML-inə sirr düşmür (brauzer keşi, ekran paylaşımı, log).
 */

export const metadata = { robots: { index: false, follow: false } };

const DIRECTION_LABEL: Record<string, string> = {
  outbound: "biz → şirkət",
  inbound: "şirkət → biz",
};

const OUTCOME_STYLE: Record<string, string> = {
  accepted: "bg-green-100 text-green-700",
  ignored: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function AdminCargoPage() {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("delivery");

  const [companies, events] = await Promise.all([
    prisma.cargoCompany.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        nameAz: true,
        noteAz: true,
        driverKey: true,
        apiBaseUrl: true,
        isActive: true,
        // Sirlər OXUNMUR — yalnız doldurulub-doldurulmadığını bilmək kifayətdir.
        // Prisma-da "boolean kimi seç" yoxdur, ona görə uzunluq üzrə hesablama
        // deyil, sadəcə mövcudluq: aşağıda `_count` alternativi yoxdur, buna görə
        // sirrin özü yerinə yalnız `updatedAt` göstərilir.
        updatedAt: true,
        branches: {
          orderBy: { sortOrder: "asc" },
          // FİLİAL SAYI SƏRHƏDLİDİR — sinxronizasiya yüzlərlə sətir gətirə
          // bilir və hamısını bir səhifədə çəkmək mənasızdır. Tam siyahı
          // şirkətin öz API-sindədir; burada ilk 100 kifayətdir.
          take: 100,
          select: {
            id: true,
            externalCode: true,
            nameAz: true,
            address: true,
            workHours: true,
            phone: true,
            lat: true,
            lng: true,
            isActive: true,
            district: { select: { nameAz: true } },
          },
        },
      },
    }),
    prisma.cargoStatusEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        direction: true,
        status: true,
        rawStatus: true,
        outcome: true,
        reason: true,
        createdAt: true,
        company: { select: { nameAz: true } },
        order: { select: { reference: true } },
      },
    }),
  ]);

  const branchCount = companies.reduce((n, c) => n + c.branches.length, 0);

  return (
    <>
      <PageHeader
        title="Kargo şirkətləri"
        subtitle={`${companies.length} şirkət · ${branchCount} filial — inteqrasiya sənədi: `}
      />

      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        Yeni şirkət qoşmaq üçün onlara bu linki verin:{" "}
        <Link
          href="/cargo-docs"
          className="font-mono text-brand underline"
          target="_blank"
        >
          /cargo-docs
        </Link>
      </p>

      {/* YENİ ŞİRKƏT — sürücü qatı tamamilə bazadan qurulur, ona görə burada
          sətir yaratmaq kifayətdir (kod dəyişikliyi lazım deyil). */}
      <Card className="mb-6 p-4">
        <h3 className="mb-3 font-semibold text-brand-ink">Yeni kargo şirkəti</h3>
        <form action={createCargoCompany} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Ad (AZ)</label>
            <input
              name="nameAz"
              required
              placeholder="Kargo Express"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              API ünvanı (varsa)
            </label>
            <input
              name="apiBaseUrl"
              placeholder="https://api.kargo.az"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">API tokeni</label>
            <input
              name="apiToken"
              className="w-40 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
          >
            Əlavə et
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          API ünvanı verilməsə əl sürücüsü işə düşür — tarif təxmini hesablanır,
          izləmə əl ilə yenilənir.
        </p>
      </Card>

      <div className="space-y-6">
        {companies.length === 0 ? (
          <EmptyState>
            Şirkət yoxdur. <code>npm run cargo:seed</code> işlədin.
          </EmptyState>
        ) : (
          companies.map((c) => (
            <Card key={c.id}>
              {/* --- başlıq --- */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {c.nameAz}
                    <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                      {c.key}
                    </span>
                  </h3>
                  {c.noteAz && (
                    <p className="text-xs text-muted-foreground">{c.noteAz}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <SyncBranchesButton
                    companyKey={c.key}
                    disabled={!c.apiBaseUrl}
                  />
                  <ActiveToggle
                    kind="company"
                    id={c.key}
                    checked={c.isActive}
                    label={c.nameAz}
                  />
                </div>
              </div>

              {/* --- API ayarları --- */}
              <form
                action={updateCargoCompany}
                className="grid gap-3 border-b border-border px-4 py-4 sm:grid-cols-2"
              >
                <input type="hidden" name="key" value={c.key} />

                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    API ünvanı
                  </span>
                  <input
                    name="apiBaseUrl"
                    defaultValue={c.apiBaseUrl ?? ""}
                    placeholder="https://api.sirket.az"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Driver
                  </span>
                  <select
                    name="driverKey"
                    defaultValue={c.driverKey}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  >
                    <option value="manual">manual — sorğu atılmır</option>
                    <option value="http">http — real API</option>
                  </select>
                </label>

                {/* Sirlər: boş buraxılsa MÖVCUD dəyər saxlanılır. */}
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    API açarı{" "}
                    <span className="opacity-70">(boş = dəyişmə)</span>
                  </span>
                  <input
                    name="apiToken"
                    type="password"
                    autoComplete="off"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    Webhook sirri{" "}
                    <span className="opacity-70">(boş = dəyişmə)</span>
                  </span>
                  <input
                    name="webhookSecret"
                    type="password"
                    autoComplete="off"
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                </label>

                <div className="sm:col-span-2">
                  <p className="mb-2 break-all text-xs text-muted-foreground">
                    Webhook ünvanı (şirkətə verin):{" "}
                    <code className="font-mono text-foreground">
                      {SITE_URL}/api/cargo/{c.key}/webhook
                    </code>
                  </p>
                  <button
                    type="submit"
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                  >
                    Yadda saxla
                  </button>
                </div>
              </form>

              {/* --- filiallar --- */}
              {c.branches.length === 0 ? (
                <EmptyState>Filial yoxdur.</EmptyState>
              ) : (
                <div className="divide-y divide-border">
                  {c.branches.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                    >
                      <div className="min-w-[220px] flex-1">
                        <p className="text-sm font-medium text-foreground">
                          {b.nameAz}
                          <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                            {b.externalCode}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.address}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          b.district
                            ? "bg-secondary text-foreground"
                            : "bg-amber-100 text-amber-700"
                        }`}
                        title={
                          b.district
                            ? "Rayon bağlıdır — tarif hesablanır"
                            : "Rayon bağlanmayıb — çatdırılma tarifi hesablana bilmir"
                        }
                      >
                        {b.district?.nameAz ?? "rayon yoxdur"}
                      </span>

                      <span className="w-28 text-xs text-muted-foreground">
                        {b.workHours ?? "—"}
                      </span>
                      <span className="w-32 text-xs text-muted-foreground">
                        {b.phone ?? "—"}
                      </span>
                      <span className="w-24 text-xs text-muted-foreground">
                        {b.lat != null && b.lng != null
                          ? `${b.lat.toFixed(3)}, ${b.lng.toFixed(3)}`
                          : "koordinat yox"}
                      </span>

                      <ActiveToggle
                        kind="branch"
                        id={b.id}
                        checked={b.isActive}
                        label={b.nameAz}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* --- hadisə jurnalı --- */}
      <div className="mt-8">
        <PageHeader
          title="Status hadisələri"
          subtitle="Son 20 — rədd edilənlər də görünür ki, inteqrasiya problemi gizli qalmasın"
        />
        <Card>
          {events.length === 0 ? (
            <EmptyState>Hələ hadisə yoxdur.</EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs"
                >
                  <span className="w-36 text-muted-foreground">
                    {e.createdAt.toLocaleString("az-AZ")}
                  </span>
                  <span className="w-28 font-medium text-foreground">
                    {e.company?.nameAz ?? "—"}
                  </span>
                  <span className="w-28 text-muted-foreground">
                    {DIRECTION_LABEL[e.direction] ?? e.direction}
                  </span>
                  <span className="w-28 font-mono text-foreground">
                    {e.status}
                    {e.rawStatus && e.rawStatus !== e.status && (
                      <span className="ml-1 opacity-60">({e.rawStatus})</span>
                    )}
                  </span>
                  <span className="w-32 font-mono text-muted-foreground">
                    {e.order?.reference ?? "sifariş tapılmadı"}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 ${
                      OUTCOME_STYLE[e.outcome] ?? "bg-secondary"
                    }`}
                  >
                    {e.outcome}
                  </span>
                  {e.reason && (
                    <span className="text-muted-foreground">{e.reason}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
