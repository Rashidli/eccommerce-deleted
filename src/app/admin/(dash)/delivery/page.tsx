import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { Card, EmptyState, PageHeader } from "@/components/admin/ui";
import {
  createPickupPoint,
  deletePickupPoint,
  saveDistrictTariff,
  savePickupPoint,
} from "./actions";
import { DeleteButton } from "@/components/admin/form-actions";
import { CityToggle } from "./city-toggle";

/**
 * YERLİ ÇATDIRILMA — rayon tarifləri və PUDO məntəqələri.
 *
 * Bu, platforma çatdırılmasından (`/admin/shipping`) AYRIDIR:
 *   · `/admin/shipping` → platforma → anbar (CNY/EUR)
 *   · bu səhifə         → anbar → müştəri (AZN)
 *
 * Qiymətlər KODDA sabit deyil — seed yalnız başlanğıc dəyər qoyub, həqiqi
 * tarifi admin burada təyin edir (qayda #4).
 */

export const metadata = { robots: { index: false, follow: false } };

const money = (cents: number) => (cents / 100).toFixed(2);

export default async function AdminDeliveryPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  // İcazə yoxlaması səhifənin ÖZÜNDƏ: menyu gizlətmək kifayət deyil,
  // ünvanı əl ilə yazmaq mümkündür.
  await requirePermission("delivery");

  const { company = "" } = await searchParams;

  const [cities, pickups, companies] = await Promise.all([
    prisma.city.findMany({
      orderBy: { sortOrder: "asc" },
      include: { districts: { orderBy: { sortOrder: "asc" } } },
    }),
    prisma.pickupPoint.findMany({
      orderBy: { sortOrder: "asc" },
      include: { city: true },
    }),
    prisma.cargoCompany.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameAz: true, isActive: true },
    }),
  ]);

  const activeCompany = companies.some((c) => c.id === company) ? company : "";

  // Seçilmiş şirkətin öz tarifləri — rayon üzrə xəritə.
  const overrides = activeCompany
    ? await prisma.districtTariff.findMany({ where: { companyId: activeCompany } })
    : [];
  const overrideBy = new Map(overrides.map((o) => [o.districtId, o]));

  const districtCount = cities.reduce((n, c) => n + c.districts.length, 0);

  return (
    <>
      <PageHeader
        title="Yerli çatdırılma"
        subtitle={`${cities.length} şəhər · ${districtCount} rayon · ${pickups.length} məntəqə — kuryer haqqı rayona görə hesablanır`}
      />

      {/* KARGO ŞİRKƏTİ SEÇİMİ.
          "Ümumi tarif" — heç bir şirkət qiyməti olmayanda işləyən ehtiyat.
          Şirkət seçiləndə həmin şirkətin öz qiymətləri redaktə olunur; boş
          buraxılan sətir "xüsusi qiymət yoxdur" deməkdir və silinir. */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/delivery"
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
            activeCompany === ""
              ? "border-brand bg-brand text-brand-foreground"
              : "border-border text-foreground hover:bg-secondary"
          }`}
        >
          Ümumi tarif
        </Link>
        {companies.map((c) => (
          <Link
            key={c.id}
            href={`/admin/delivery?company=${c.id}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              activeCompany === c.id
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border text-foreground hover:bg-secondary"
            } ${c.isActive ? "" : "opacity-60"}`}
          >
            {c.nameAz}
          </Link>
        ))}
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {activeCompany
          ? "Bu şirkətin öz qiymətləri. Boş buraxılan rayonda ümumi tarif işləyir."
          : "Ehtiyat qiymətlər — şirkətin öz tarifi yoxdursa bunlar tətbiq olunur."}
      </p>

      {/* ŞƏHƏR / RAYON TARİFLƏRİ */}
      <div className="space-y-4">
        {cities.map((city) => (
          <Card key={city.id}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold text-foreground">
                {city.nameAz}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {city.districts.length} rayon
                </span>
              </h3>
              <CityToggle
                id={city.id}
                checked={city.isActive}
                label={city.nameAz}
              />
            </div>

            {city.districts.length === 0 ? (
              <EmptyState>Rayon yoxdur.</EmptyState>
            ) : (
              <div className="divide-y divide-border">
                {city.districts.map((d) => {
                  // Şirkət seçilibsə onun öz sətri göstərilir; yoxdursa sahə
                  // BOŞ qalır — "xüsusi qiymət yoxdur, ümumi tarif işləyir".
                  const o = overrideBy.get(d.id);
                  const price = activeCompany
                    ? o
                      ? money(o.priceCents)
                      : ""
                    : money(d.priceCents);

                  return (
                  <form
                    key={d.id}
                    action={saveDistrictTariff}
                    className="flex flex-wrap items-center gap-3 px-4 py-2.5"
                  >
                    <input type="hidden" name="id" value={d.id} />
                    {activeCompany && (
                      <input type="hidden" name="companyId" value={activeCompany} />
                    )}

                    <span className="min-w-[140px] flex-1 text-sm font-medium text-foreground">
                      {d.nameAz}
                      {activeCompany && !o && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          ümumi: {money(d.priceCents)} {d.currency}
                        </span>
                      )}
                    </span>

                    <label className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        Tarif
                      </span>
                      <input
                        name="price"
                        defaultValue={price}
                        placeholder={activeCompany ? money(d.priceCents) : undefined}
                        inputMode="decimal"
                        className="w-24 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                      />
                      <span className="text-xs text-muted-foreground">
                        {d.currency}
                      </span>
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isFree"
                        defaultChecked={o ? o.isFree : d.isFree}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                      Pulsuz
                    </label>

                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={o ? o.isActive : d.isActive}
                        className="h-4 w-4 accent-[var(--color-brand)]"
                      />
                      Aktiv
                    </label>

                    <button
                      type="submit"
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                    >
                      Yadda saxla
                    </button>
                  </form>
                  );
                })}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* PUDO MƏNTƏQƏLƏRİ */}
      <div className="mt-8">
        <PageHeader
          title="Paket məntəqələri (PUDO)"
          subtitle="Müştəri özü gəlib götürür — adətən pulsuzdur"
        />

        <Card>
          {pickups.length === 0 ? (
            <EmptyState>Məntəqə yoxdur.</EmptyState>
          ) : (
            <div className="divide-y divide-border">
              {pickups.map((p) => (
                // Silmə düyməsi ÖZ formunu render edir — ona görə saxlama formu
                // ilə qardaşdır, iç-içə deyil (iç-içə <form> yolverilməzdir və
                // brauzer xarici formu sındırır).
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <form
                  action={savePickupPoint}
                  className="flex flex-1 flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="id" value={p.id} />

                  <div className="min-w-[200px] flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {p.nameAz}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.city.nameAz} · {p.address}
                    </p>
                  </div>

                  <input
                    name="workHours"
                    defaultValue={p.workHours ?? ""}
                    placeholder="İş saatları"
                    className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <input
                    name="phone"
                    defaultValue={p.phone ?? ""}
                    placeholder="Telefon"
                    className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                  />
                  <label className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Haqq</span>
                    <input
                      name="price"
                      defaultValue={money(p.priceCents)}
                      inputMode="decimal"
                      className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
                    />
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={p.isActive}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                    Aktiv
                  </label>

                  <button
                    type="submit"
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-brand hover:text-brand-foreground"
                  >
                    Yadda saxla
                  </button>
                </form>

                <DeleteButton action={deletePickupPoint} id={p.id} compact />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* YENİ MƏNTƏQƏ — əvvəl yalnız seed ilə yaranırdı, yəni yeni məntəqə
            üçün deploy lazım idi. */}
        <Card className="mt-4 p-4">
          <h3 className="mb-3 font-semibold text-brand-ink">Yeni məntəqə</h3>
          <form action={createPickupPoint} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Ad (AZ)</label>
              <input
                name="nameAz"
                required
                placeholder="E-Commerce Nəsimi filialı"
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Şəhər</label>
              <select
                name="cityId"
                required
                className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nameAz}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[200px] flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Ünvan</label>
              <input
                name="address"
                required
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">İş saatları</label>
              <input
                name="workHours"
                placeholder="10:00–19:00"
                className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Telefon</label>
              <input
                name="phone"
                className="w-36 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Haqq</label>
              <input
                name="price"
                defaultValue="0"
                inputMode="decimal"
                className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
            >
              Əlavə et
            </button>
          </form>
        </Card>
      </div>
    </>
  );
}
