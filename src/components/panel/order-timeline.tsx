"use client";

import {
  Check,
  CreditCard,
  Package,
  Truck,
  PackageCheck,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { useLang } from "@/context/lang-context";
import type { PanelOrder } from "@/lib/data/account";
import { stepIndex } from "./status";

/**
 * Sifarişin gedişi — müştərinin bu səhifəni açmaqda əsas məqsədi budur.
 *
 * Mərhələlər YALNIZ bazadan çıxarılır: `status`, `isPaid`, `paidDate`,
 * `deliveryDate`. Baş verməmiş addımın tarixi UYDURULMUR — sadəcə tarixsiz,
 * "hələ çatmayıb" görünüşündə qalır.
 *
 * Üç vəziyyət gözlə seçilir:
 *   · tamamlandı — dolu brend dairəsi, ✓
 *   · cari       — halqalı brend dairəsi + pulsuz nəbz (canlı olduğu bilinsin)
 *   · çatmayıb   — solğun boz dairə
 */
type Step = {
  key: string;
  label: string;
  date: string;
  icon: typeof Check;
  done: boolean;
  current: boolean;
};

export function OrderTimeline({ order }: { order: PanelOrder }) {
  const { t } = useLang();

  const cancelled = order.status === "cancelled";
  const idx = stepIndex(order.status);

  // Ləğv edilmiş sifarişdə qalan mərhələləri göstərmək yanıldıcıdır —
  // yalnız baş verənlər + ləğv faktı.
  const steps: Step[] = cancelled
    ? [
        {
          key: "placed",
          label: t.panel.stepPlaced,
          date: order.date,
          icon: ShoppingBag,
          done: true,
          current: false,
        },
        {
          key: "cancelled",
          label: t.panel.stepCancelled,
          date: "",
          icon: XCircle,
          done: true,
          current: true,
        },
      ]
    : [
        {
          key: "placed",
          label: t.panel.stepPlaced,
          date: order.date,
          icon: ShoppingBag,
          done: true,
          current: idx <= 0 && !order.isPaid,
        },
        {
          key: "paid",
          label: t.panel.stepPaid,
          // Ödənilməyibsə tarix YOXDUR — boş qalır, uydurulmur.
          date: order.paidDate,
          icon: CreditCard,
          done: order.isPaid,
          current: !order.isPaid,
        },
        {
          key: "processing",
          label: t.panel.stepProcessing,
          date: "",
          icon: Package,
          done: idx >= 1,
          current: idx === 1,
        },
        {
          key: "shipped",
          label: t.panel.stepShipped,
          // İzləmə nömrəsi varsa mərhələnin altında göstərilir.
          date: idx >= 2 && order.tracking !== "—" ? order.tracking : "",
          icon: Truck,
          done: idx >= 2,
          current: idx === 2,
        },
        {
          key: "delivered",
          label: t.panel.stepDelivered,
          // Tarix yalnız ÇATDIRILIBSA göstərilir; əks halda bu, təxmini
          // tarixdir və "çatdırıldı" kimi oxunmamalıdır.
          date: idx >= 3 ? order.deliveryDate : "",
          icon: PackageCheck,
          done: idx >= 3,
          current: idx === 3,
        },
      ];

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t.panel.timeline}
      </h2>

      <ol className="relative space-y-0">
        {steps.map((step, i) => {
          const last = i === steps.length - 1;
          const Icon = step.done ? Check : step.icon;

          return (
            <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
              {/* Şaquli xətt — tamamlanmış hissə brend rəngində */}
              {!last && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full ${
                    steps[i + 1].done ? "bg-brand/40" : "bg-border"
                  }`}
                />
              )}

              <span
                className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-card transition-colors ${
                  step.done
                    ? "bg-brand text-brand-foreground"
                    : step.current
                      ? "bg-brand/10 text-brand ring-brand/20"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {/* Cari mərhələ "canlı" görünsün */}
                {step.current && !step.done && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-full bg-brand/30"
                  />
                )}
              </span>

              <div className="min-w-0 flex-1 pt-1">
                <p
                  className={`text-sm font-semibold ${
                    step.done || step.current
                      ? "text-brand-ink"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </p>
                {step.date && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {step.date}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * Siyahı üçün YIĞCAM göstərici — eyni mərhələ məntiqi, nöqtələr şəklində.
 * Detal səhifəsi ilə eyni mənbədən (`stepIndex`) qidalanır ki, ayrılmasın.
 */
export function OrderProgressDots({ order }: { order: PanelOrder }) {
  const { t } = useLang();
  const cancelled = order.status === "cancelled";
  const idx = stepIndex(order.status);

  if (cancelled) {
    return (
      <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
        {t.panel.stepCancelled}
      </p>
    );
  }

  const labels = [
    t.panel.stepPlaced,
    t.panel.stepProcessing,
    t.panel.stepShipped,
    t.panel.stepDelivered,
  ];

  return (
    <div className="flex items-center gap-1.5">
      <span className="flex flex-1 gap-1" aria-hidden>
        {labels.map((label, i) => (
          <span
            key={label}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= idx ? "bg-brand" : "bg-border"
            }`}
          />
        ))}
      </span>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">
        {labels[Math.max(0, idx)]}
      </span>
    </div>
  );
}
