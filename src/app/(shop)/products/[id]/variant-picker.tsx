"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useLang } from "@/context/lang-context";
import {
  isCombinationAvailable,
  type ProductVariantsDTO,
  type VariantAxisDTO,
} from "@/lib/products/variants";

/**
 * Variant seçicisi — rəng/ölçü/digər oxlar.
 *
 * Platformadan ASILI DEYİL: yalnız `ProductVariantsDTO` görür, məhsulun
 * 1688-dən, Taobao-dan, yoxsa Zara-dan gəldiyini bilmir (qayda #6).
 *
 * UX qərarları (müştəri şikayəti — "optionlar pis görünür"):
 *  · Ox BAŞLIĞI lokallaşdırılır. Taobao oxu "颜色分类" adlandırır; xam adı
 *    göstərmək istifadəçiyə heç nə demirdi. `kind` artıq təsnif olunduğu üçün
 *    tanınan oxlarda "Rəng"/"Ölçü" yazılır, tanınmayanda platformanın adı qalır.
 *  · Seçilməyən ox AÇIQ göstərilir ("seçilməyib"), çünki seçim məcburidir.
 *  · Rəng şəkilləri kvadrat lövhə deyil, kompakt swatch + seçim işarəsi.
 *  · Mövcud olmayan kombinasiya SÖNÜK qalır, gizlədilmir — istifadəçi məhsulun
 *    o variantının olduğunu, sadəcə bitdiyini görsün.
 *  · Uzun dəyər mətnləri kəsilir (Çin ölçü adları çox uzundur) — tam mətn
 *    `title`-dədir, düymələr eyni hündürlükdə qalır.
 */
export function VariantPicker({
  data,
  selection,
  onSelect,
}: {
  data: ProductVariantsDTO;
  selection: Record<string, string>;
  onSelect: (axisKey: string, value: string) => void;
}) {
  const { t } = useLang();
  if (data.axes.length === 0) return null;

  /** Tanınan ox → lokallaşdırılmış ad; tanınmayan → platformanın öz adı. */
  const axisLabel = (axis: VariantAxisDTO): string => {
    if (axis.kind === "color") return t.product.color;
    if (axis.kind === "size") return t.product.size;
    return axis.label;
  };

  return (
    <div className="space-y-5">
      {data.axes.map((axis) => {
        const picked = selection[axis.key];
        const pickedLabel = axis.values.find((v) => v.value === picked)?.label;
        // Cari oxun öz seçimi mövcudluğa təsir etməsin — yalnız digər oxlar
        // məhdudlaşdırır.
        const others = Object.fromEntries(
          Object.entries(selection).filter(([k]) => k !== axis.key),
        );

        return (
          <div key={axis.key}>
            <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
              <h3 className="text-sm font-semibold text-foreground">
                {axisLabel(axis)}
              </h3>
              {picked ? (
                <span
                  className="max-w-[60%] truncate text-sm text-muted-foreground"
                  title={pickedLabel}
                >
                  {pickedLabel}
                </span>
              ) : (
                <span className="text-xs font-medium text-brand">
                  {t.product.selectRequired}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {axis.values.map((value) => {
                const available = isCombinationAvailable(
                  data,
                  others,
                  axis.key,
                  value.value,
                );
                const active = picked === value.value;
                const title = available
                  ? value.label
                  : `${value.label} — ${t.product.unavailable}`;

                // Şəkilli seçim (rəng) — platformalar rəng variantına şəkil verir.
                if (axis.kind === "color" && value.image) {
                  return (
                    <button
                      key={value.value}
                      type="button"
                      disabled={!available}
                      title={title}
                      aria-label={value.label}
                      aria-pressed={active}
                      onClick={() => onSelect(axis.key, value.value)}
                      className={`relative h-14 w-14 overflow-hidden rounded-lg border transition-all ${
                        active
                          ? "border-brand ring-2 ring-brand/30"
                          : "border-border hover:border-brand/50"
                      } ${
                        available
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-35"
                      }`}
                    >
                      <Image
                        src={value.image}
                        alt={value.label}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                      {active && (
                        <span className="absolute inset-x-0 bottom-0 grid h-5 place-items-center bg-brand/90 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                }

                // Platforma HƏQİQİ hex rəng veribsə dairə göstərilir.
                // Verməyibsə rəng uydurulmur — mətn düyməsinə düşür.
                if (axis.kind === "color" && value.swatch) {
                  return (
                    <button
                      key={value.value}
                      type="button"
                      disabled={!available}
                      title={title}
                      aria-label={value.label}
                      aria-pressed={active}
                      onClick={() => onSelect(axis.key, value.value)}
                      className={`grid h-10 w-10 place-items-center rounded-full border-2 transition-all ${
                        active
                          ? "border-brand ring-2 ring-brand/25"
                          : "border-border hover:border-brand/50"
                      } ${
                        available
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-35"
                      }`}
                      style={{ backgroundColor: value.swatch }}
                    >
                      {active && (
                        <Check className="h-4 w-4 text-white mix-blend-difference" />
                      )}
                    </button>
                  );
                }

                return (
                  <button
                    key={value.value}
                    type="button"
                    disabled={!available}
                    title={title}
                    aria-pressed={active}
                    onClick={() => onSelect(axis.key, value.value)}
                    className={`h-10 min-w-[3rem] max-w-[13rem] truncate rounded-lg border px-3.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-brand bg-brand text-white"
                        : "border-border text-foreground/80 hover:border-brand hover:text-brand"
                    } ${
                      available
                        ? "cursor-pointer"
                        : "cursor-not-allowed bg-muted/60 text-muted-foreground/60 opacity-60"
                    }`}
                  >
                    {value.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
