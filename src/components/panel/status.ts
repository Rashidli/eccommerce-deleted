import type { PanelOrderStatus } from "@/lib/data/account";

/**
 * Sifariş statusunun ORTAQ görünüş qaydaları.
 *
 * Niyə ayrıca fayl: eyni status siyahıda, detalda və timeline-da EYNİ rəngdə
 * olmalıdır. Əvvəl hər komponent öz `statusStyles` obyektini saxlayırdı və
 * onlar bir-birindən ayrılmışdı (məs. "ödənilməyib" nişanı bir yerdə amber,
 * o birində rose idi).
 *
 * Status semantikası (gözləmə / iş / yol / uğur / ləğv) brend tokenləri ilə
 * ifadə oluna bilmir — yeganə yerdir ki, sabit rənglər işlədilir. Dark rejim
 * üçün hər birinin `dark:` qarşılığı var.
 */
export const STATUS_STYLES: Record<PanelOrderStatus, string> = {
  pending:
    "bg-secondary text-muted-foreground ring-border",
  processing:
    "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30",
  shipped:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30",
  delivered:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30",
  cancelled:
    "bg-rose-100 text-rose-700 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/30",
};

/** "Ödəniş gözlənilir" nişanı — statusdan AYRIDIR, hər yerdə eyni görünür. */
export const UNPAID_STYLE =
  "bg-amber-100 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30";

/**
 * Sifarişin gedişindəki mərhələlər — DB statusundan çıxarılır.
 * `cancelled` xüsusi haldır: qalan mərhələlər göstərilmir.
 */
export const STEP_ORDER: PanelOrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
];

/** Verilmiş statusun mərhələ sırasındakı indeksi (`cancelled` → -1). */
export function stepIndex(status: PanelOrderStatus): number {
  return STEP_ORDER.indexOf(status);
}
