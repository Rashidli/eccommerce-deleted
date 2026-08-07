"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { fromDateInput, parseMoney } from "@/lib/format";

function readForm(formData: FormData) {
  const type = String(formData.get("type") ?? "percent");
  const rawValue = String(formData.get("value") ?? "0");
  const usageLimit = parseInt(String(formData.get("usageLimit") ?? ""), 10);

  return {
    code: String(formData.get("code") ?? "").trim().toUpperCase(),
    type: type === "fixed" ? "fixed" : "percent",
    // Faiz tam ədəddir (10 = 10%), sabit endirim sentlə saxlanır.
    value: type === "fixed" ? parseMoney(rawValue) : parseInt(rawValue, 10) || 0,
    minOrderCents: parseMoney(formData.get("minOrder")),
    usageLimit: Number.isFinite(usageLimit) && usageLimit > 0 ? usageLimit : null,
    startsAt: fromDateInput(formData.get("startsAt")),
    expiresAt: fromDateInput(formData.get("expiresAt")),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createPromoCode(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.code || data.value <= 0) return;

  await prisma.promoCode.create({ data });
  revalidatePath("/admin/promo-codes");
  redirect("/admin/promo-codes");
}

export async function updatePromoCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.code || data.value <= 0) return;

  await prisma.promoCode.update({ where: { id }, data });
  revalidatePath("/admin/promo-codes");
  redirect("/admin/promo-codes");
}

export async function deletePromoCode(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.promoCode.delete({ where: { id } });
  revalidatePath("/admin/promo-codes");
}
