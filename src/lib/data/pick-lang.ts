import "server-only";
import type { Lang } from "@/lib/i18n";

const CAP: Record<Lang, "Az" | "En" | "Ru"> = { az: "Az", en: "En", ru: "Ru" };

/**
 * Trilingual sahədən dilə uyğun dəyəri seçir: base+Lang → base+En → base.
 * Məs. pickLang(product, "name", "az") → nameAz ?? nameEn ?? name.
 */
export function pickLang(
  row: Record<string, unknown>,
  base: string,
  lang: Lang,
): string {
  const value = row[`${base}${CAP[lang]}`] ?? row[`${base}En`] ?? row[base];
  return typeof value === "string" ? value : "";
}
