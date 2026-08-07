"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidateCurrencyCache } from "@/lib/currency/config";

/**
 * Valyuta ayarları və məzənnələr — admin idarəsi.
 * Qayda #1: yalnız admin sessiyası. Qayda #4: məzənnə kodda sabit deyil.
 */

/** Dəyişiklikdən sonra keş və göstərilən səhifələr yenilənir. */
function revalidateAll() {
  invalidateCurrencyCache();
  revalidatePath("/admin/currency");
  revalidatePath("/", "layout");
}

/** Göstəriş valyutası + marja. Boş valyuta → çevirmə SÖNÜR. */
export async function saveCurrencySettings(formData: FormData) {
  await requireAdmin();

  const raw = String(formData.get("displayCurrency") ?? "").trim().toUpperCase();
  const displayCurrency = raw || null;

  // Marja bazis punktu ilə (250 = %2.5). Mənfi marja qəbul edilmir.
  const pct = parseFloat(String(formData.get("markupPct") ?? "0").replace(",", "."));
  const markupBps = Number.isFinite(pct) && pct >= 0 ? Math.round(pct * 100) : 0;

  await prisma.currencySettings.upsert({
    where: { id: "default" },
    create: { id: "default", displayCurrency, markupBps },
    update: { displayCurrency, markupBps },
  });

  revalidateAll();
}

/** Bir məzənnə sətri (base → quote). */
export async function saveExchangeRate(formData: FormData) {
  await requireAdmin();

  const base = String(formData.get("base") ?? "").trim().toUpperCase();
  const quote = String(formData.get("quote") ?? "").trim().toUpperCase();
  const rate = parseFloat(String(formData.get("rate") ?? "").replace(",", "."));

  // Eyni valyuta cütü mənasızdır; sıfır/mənfi məzənnə qiyməti korlayır.
  if (!base || !quote || base === quote) return;
  if (!Number.isFinite(rate) || rate <= 0) return;

  await prisma.exchangeRate.upsert({
    where: { base_quote: { base, quote } },
    create: { base, quote, rate, source: "manual", fetchedAt: new Date() },
    update: { rate, source: "manual", fetchedAt: new Date() },
  });

  revalidateAll();
}

export async function deleteExchangeRate(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.exchangeRate.delete({ where: { id } });
  revalidateAll();
}
