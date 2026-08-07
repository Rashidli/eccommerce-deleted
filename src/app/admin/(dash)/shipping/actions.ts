"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseMoney } from "@/lib/format";

/**
 * Platforma çatdırılma tarifləri — admin idarəsi.
 * Qayda #1: yalnız admin sessiyası. Qayda #4: tarif kodda sabit deyil.
 */
export async function saveShippingRule(formData: FormData) {
  await requireAdmin();

  const platformKey = String(formData.get("platformKey") ?? "").trim();
  if (!platformKey) return;

  const int = (name: string): number => {
    const n = parseInt(String(formData.get(name) ?? "0"), 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  // Pulsuz hədd boş qoyula bilər — "heç vaxt pulsuz" deməkdir.
  const freeRaw = String(formData.get("freeOver") ?? "").trim();
  const freeOverCents = freeRaw ? parseMoney(freeRaw) : null;

  const data = {
    baseCents: parseMoney(formData.get("base")),
    perKgCents: parseMoney(formData.get("perKg")),
    fallbackWeightGrams: int("fallbackWeightGrams"),
    freeOverCents,
    currency: String(formData.get("currency") ?? "CNY").trim().toUpperCase(),
    isActive: formData.get("isActive") === "on",
  };

  await prisma.platformShippingRule.upsert({
    where: { platformKey },
    create: { platformKey, ...data },
    update: data,
  });

  revalidatePath("/admin/shipping");
  // Səbət/checkout tarifi dərhal görsün.
  revalidatePath("/cart");
  revalidatePath("/checkout");
}
