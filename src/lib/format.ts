/**
 * Valyuta simvolları. Məhsullar platformanın ÖZ valyutasında saxlanılır
 * (1688/Taobao → CNY, Zara → EUR), ona görə qiymət göstərəndə simvol da
 * həmin valyutaya uyğun olmalıdır. Əvvəl hər şey "$" ilə göstərilirdi —
 * ¥128-lik məhsul $128 kimi görünürdü, yəni qiymət kökündən yanlış idi.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  EUR: "€",
  USD: "$",
  AZN: "₼",
  TRY: "₺",
  GBP: "£",
  RUB: "₽",
};

/** Valyuta kodunu simvola çevirir; tanınmayan kod olduğu kimi göstərilir. */
export function currencySymbol(currency?: string | null): string {
  if (!currency) return "$";
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

/**
 * 5490 → "¥54.90" — bazada qiymətlər sentlə (minor unit) saxlanır.
 * `currency` verilməsə USD sayılır (daxili sifariş məbləğləri üçün).
 */
export function formatMoney(cents: number, currency?: string | null): string {
  return `${currencySymbol(currency)}${(cents / 100).toFixed(2)}`;
}

/**
 * Çevrilmiş məbləği göstərir: "≈₼18.90".
 *
 * "≈" QƏSDƏNdir — çevrilmiş rəqəm təxminidir və müştəridən tutulan məbləğ
 * DEYİL (ödəniş platformanın öz valyutasında gedir). Onu adi qiymətdən
 * fərqləndirmək lazımdır, yoxsa müştəri dəqiq məbləğ sanar.
 */
export function formatConverted(
  amount: { cents: number; currency: string; isConverted: boolean },
): string {
  const text = formatMoney(amount.cents, amount.currency);
  return amount.isConverted ? `≈${text}` : text;
}

/** "54.90" → 5490. Boş/yanlış dəyər 0 qaytarır. */
export function parseMoney(input: FormDataEntryValue | null): number {
  const value = parseFloat(String(input ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date → "2026-07-10" (<input type="date"> üçün) */
export function toDateInput(date: Date | null): string {
  return date ? new Date(date).toISOString().slice(0, 10) : "";
}

/** "2026-07-10" → Date; boşdursa null. */
export function fromDateInput(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Yay Endirimi 2026" → "yay-endirimi-2026" */
export function slugify(input: string): string {
  const map: Record<string, string> = {
    ə: "e", ı: "i", ö: "o", ü: "u", ğ: "g", ş: "s", ç: "c",
    Ə: "e", I: "i", Ö: "o", Ü: "u", Ğ: "g", Ş: "s", Ç: "c",
  };
  return input
    .replace(/[əıöüğşçƏIÖÜĞŞÇ]/g, (char) => map[char] ?? char)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diakritikaları at
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
