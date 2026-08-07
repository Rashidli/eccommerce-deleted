"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/**
 * ALIŞ (PlatformOrder) ƏMƏLİYYATLARI — OPERATOR ÜÇÜN.
 *
 * Avto-alış job-u ödəniş anında dayana bilər (3-D Secure, şəbəkə kəsilməsi).
 * Belə halda sifariş `paying` qalır və job BİR DAHA İŞLƏMİR — bu, qəsdəndir:
 * nəticəsi məlum olmayan alışı avtomatik təkrarlamaq ən pis nəticədir
 * (eyni mal iki dəfə alınar). Vəziyyəti YALNIZ insan bağlayır və bu bölmə
 * məhz onun üçündür.
 */

/**
 * Alış UĞURLA bitib: Zara sifariş nömrəsi yazılır və sətirlər bu alışa
 * bağlanır.
 *
 * Sətirlərin bağlanması İDEMPOTENTLİYİN əsasıdır: `platformOrderId` dolu olan
 * sətir növbəti icranın planına ümumiyyətlə düşmür.
 */
export async function markPurchasePaid(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const externalOrderId = String(formData.get("externalOrderId") ?? "").trim();
  if (!id || !externalOrderId) {
    redirect(
      `/admin/purchases/${id}?error=${encodeURIComponent(
        "Zara sifariş nömrəsi boş ola bilməz — onsuz alışı bağlamaq olmaz.",
      )}`,
    );
  }

  // Eyni nömrə iki alışa yazıla bilməz (sxemdə də UNIQUE-dir) — səbəbi
  // anlaşılan mesajla deyirik.
  const clash = await prisma.platformOrder.findFirst({
    where: { externalOrderId, id: { not: id } },
    select: { id: true },
  });
  if (clash) {
    redirect(
      `/admin/purchases/${id}?error=${encodeURIComponent(
        `Bu sifariş nömrəsi başqa alışda (${clash.id}) artıq yazılıb.`,
      )}`,
    );
  }

  await prisma.platformOrder.update({
    where: { id },
    data: { externalOrderId, status: "paid", purchasedAt: new Date() },
  });

  await prisma.purchaseLog.create({
    data: {
      platformOrderId: id,
      runId: `manual-${id}`,
      step: "pay",
      outcome: "ok",
      message: `Operator əl ilə bağladı — Zara sifariş nömrəsi: ${externalOrderId}`,
    },
  });

  revalidatePath("/admin/purchases");
  revalidatePath(`/admin/purchases/${id}`);
  redirect(`/admin/purchases/${id}?ok=1`);
}

/**
 * Alış BAŞ TUTMAYIB: status `failed` olur və job yenidən cəhd edə bilər.
 *
 * Bunu yalnız Zara hesabında YOXLADIQDAN sonra etmək olar — sifariş əslində
 * keçibsə, `failed` yazmaq eyni malın ikinci dəfə alınmasına yol açır.
 */
export async function markPurchaseFailed(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return;

  await prisma.platformOrder.update({
    where: { id },
    data: { status: "failed", paymentStartedAt: null },
  });

  await prisma.purchaseLog.create({
    data: {
      platformOrderId: id,
      runId: `manual-${id}`,
      step: "pay",
      outcome: "fail",
      message: note
        ? `Operator "alınmadı" işarələdi: ${note}`
        : "Operator «alınmadı» işarələdi — job təkrar cəhd edə bilər.",
    },
  });

  revalidatePath("/admin/purchases");
  revalidatePath(`/admin/purchases/${id}`);
  redirect(`/admin/purchases/${id}?ok=1`);
}

/**
 * Alışı «yoxlanmalı» vəziyyətinə salır.
 *
 * Operator dərhal qərar verə bilmirsə (məs. Zara-da sifariş görünmür, amma
 * kartdan pul gedib) alış nə `paid`, nə `failed` olur — açıq şəkildə
 * `needs_review` qalır. Job bu vəziyyətdə də DAYANIR, yəni təsadüfi ikinci
 * alış baş vermir.
 */
export async function markPurchaseNeedsReview(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!id) return;

  await prisma.platformOrder.update({ where: { id }, data: { status: "needs_review" } });

  await prisma.purchaseLog.create({
    data: {
      platformOrderId: id,
      runId: `manual-${id}`,
      step: "review",
      outcome: "skip",
      message: note || "Operator «yoxlanmalı» işarələdi.",
    },
  });

  revalidatePath("/admin/purchases");
  revalidatePath(`/admin/purchases/${id}`);
  redirect(`/admin/purchases/${id}?ok=1`);
}
