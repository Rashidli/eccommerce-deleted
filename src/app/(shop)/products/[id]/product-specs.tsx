"use client";

import { useLang } from "@/context/lang-context";
import { formatMoney } from "@/lib/format";
import type { ProductVariantsDTO } from "@/lib/products/variants";

/**
 * Məhsulun platformadan gələn xüsusiyyətləri + topdan qiymət pillələri.
 * Variant oxlarına çevrilmiş sahələr (rəng/ölçü) burada TƏKRARLANMIR — onları
 * adapter siyahıdan çıxarır, çünki seçicidəki dəyərlə ziddiyyət yaradardı.
 */
export function ProductSpecs({
  data,
  currency,
}: {
  data: ProductVariantsDTO;
  /** Məhsulun valyutası — qiymət pillələri düzgün simvolla göstərilsin. */
  currency: string;
}) {
  const { t } = useLang();
  const hasTiers = data.priceTiers.length > 0;
  if (data.specs.length === 0 && !hasTiers) return null;

  return (
    <div className="mt-10 space-y-8">
      {hasTiers && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {t.product.priceTiers}
          </h2>
          <div className="flex flex-wrap gap-3">
            {data.priceTiers.map((tier) => (
              <div
                key={tier.startQuantity}
                className="rounded-xl border border-border bg-card px-4 py-2"
              >
                <p className="text-xs text-muted-foreground">
                  {tier.startQuantity}+ {data.unit ?? ""}
                </p>
                <p className="text-base font-bold text-brand">
                  {formatMoney(tier.priceCents, currency)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.specs.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-foreground">
            {t.product.specifications}
          </h2>
          <dl className="overflow-hidden rounded-xl border border-border">
            {data.specs.map((spec, i) => (
              <div
                key={`${spec.name}-${i}`}
                className={`flex gap-4 px-4 py-2.5 text-sm ${
                  i % 2 === 0 ? "bg-card" : "bg-muted/40"
                }`}
              >
                <dt className="w-1/3 shrink-0 text-muted-foreground">
                  {spec.name}
                </dt>
                <dd className="font-medium text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}
