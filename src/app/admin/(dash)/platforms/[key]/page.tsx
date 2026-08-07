import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, EmptyState, PageHeader, Table, Td } from "@/components/admin/ui";
import { Field, FormGrid } from "@/components/admin/fields";
import { SubmitButton } from "@/components/admin/form-actions";
import { getPlatformWarehouse } from "@/lib/platform-warehouse";
import { updatePlatformWarehouse } from "../actions";
import { VisibilityToggle } from "../toggle";

// Platformanın ƏSAS kateqoriyaları — admin hansının nav zolağında, hansının
// ana səhifədə görünəcəyini burada seçir. İki bayraq AYRIDIR (qayda #4:
// görünmə qərarı kodda deyil, bazadadır).

export const metadata = { robots: { index: false, follow: false } };

export default async function AdminPlatformCategoriesPage({
  params,
  searchParams,
}: {
  // Next 16: `params` Promise-dir.
  params: Promise<{ key: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { key } = await params;
  const { error, ok } = await searchParams;

  const platform = await prisma.platform.findUnique({ where: { key } });
  if (!platform) notFound();

  const warehouse = await getPlatformWarehouse(key);

  const categories = await prisma.platformCategory.findMany({
    where: { platformKey: key, parentExternalId: "0" },
    orderBy: [{ sortOrder: "asc" }, { externalId: "asc" }],
  });

  const subCounts = await prisma.platformCategory.groupBy({
    by: ["parentExternalId"],
    where: { platformKey: key, parentExternalId: { not: "0" } },
    _count: { _all: true },
  });
  const subBy = new Map(
    subCounts.map((s) => [s.parentExternalId ?? "", s._count._all]),
  );

  const navCount = categories.filter((c) => c.showInNav).length;
  const homeCount = categories.filter((c) => c.showOnHome).length;

  return (
    <>
      <PageHeader
        title={`${platform.nameAz} — kateqoriyalar`}
        subtitle={`${categories.length} əsas kateqoriya · ${navCount} nav zolağında · ${homeCount} ana səhifədə`}
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

      {/* ANBAR ÜNVANI — avto-alış çatdırılma ünvanını buradan oxuyur.
          Kodda sabit deyil: anbar köçsə deploy lazım gəlməsin. */}
      <Card className="mb-4 p-5">
        <h2 className="mb-1 font-semibold text-brand-ink">Anbar ünvanı</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Bu platformadan alınan mal bu ünvana gəlir. Avto-alış sifarişdə yalnız
          ad/soyadı və müştəri kodunu dəyişir — qalan sahələr buradan götürülür.
        </p>
        <form action={updatePlatformWarehouse} className="space-y-5">
          <input type="hidden" name="key" value={key} />
          <FormGrid>
            <Field name="label" label="Anbarın adı" defaultValue={warehouse?.label ?? ""} />
            <Field
              name="phone"
              label="Telefon"
              defaultValue={warehouse?.phone ?? ""}
              placeholder="+34 654 95 55 85"
            />
            <Field
              name="street"
              label="Küçə və bina"
              defaultValue={warehouse?.street ?? ""}
              placeholder="Calle Indústria 60/A"
              hint="Boş buraxsanız ünvan silinir və avto-alış dayanır."
            />
            <Field
              name="postalCode"
              label="Poçt indeksi"
              defaultValue={warehouse?.postalCode ?? ""}
              placeholder="08860"
            />
            <Field
              name="city"
              label="Şəhər"
              defaultValue={warehouse?.city ?? ""}
              placeholder="Castelldefels"
            />
            <Field
              name="country"
              label="Ölkə kodu"
              defaultValue={warehouse?.country ?? ""}
              placeholder="ES"
              hint="ISO-2: ES, CN, TR…"
            />
          </FormGrid>
          <div className="border-t border-border pt-4">
            <SubmitButton />
          </div>
        </form>
      </Card>

      <Card>
        {categories.length === 0 ? (
          <EmptyState>Bu platformanın kateqoriyası yoxdur.</EmptyState>
        ) : (
          <Table
            head={["", "Ad", "Alt kateq.", "Nav zolağı", "Ana səhifə", "ID"]}
          >
            {categories.map((c) => (
              <tr key={c.id}>
                <Td>
                  <span className="relative block h-10 w-10 overflow-hidden rounded-lg bg-secondary">
                    {c.image && (
                      <Image
                        src={c.image}
                        alt={c.nameAz ?? c.externalId}
                        fill
                        sizes="40px"
                        className="object-contain p-1"
                      />
                    )}
                  </span>
                </Td>
                <Td>
                  <span className="font-medium text-foreground">
                    {c.nameAz ?? c.nameEn ?? c.externalId}
                  </span>
                  {c.nameZh && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {c.nameZh}
                    </span>
                  )}
                </Td>
                <Td className="text-muted-foreground">
                  {subBy.get(c.externalId) ?? 0}
                </Td>
                <Td>
                  <VisibilityToggle
                    id={c.id}
                    field="showInNav"
                    checked={c.showInNav}
                    label={`${c.nameAz} nav zolağında`}
                  />
                </Td>
                <Td>
                  <VisibilityToggle
                    id={c.id}
                    field="showOnHome"
                    checked={c.showOnHome}
                    label={`${c.nameAz} ana səhifədə`}
                  />
                </Td>
                <Td className="text-xs text-muted-foreground">{c.externalId}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
