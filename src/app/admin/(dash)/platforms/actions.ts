"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// Platforma və platforma kateqoriyalarının idarəetməsi.
// Qayda #1: burada YALNIZ admin sessiyası (`requireAdmin`) — customer auth ilə
// heç bir toxunma yoxdur. Qayda #4: bütün görünmə qərarları DB-dədir, kodda deyil.

/** Storefront-un kateqoriya/platforma göstərən səthlərini yeniləyir. */
function revalidateStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/categories");
  revalidatePath("/products");
}

/** Platformanı aktiv/deaktiv edir — deaktiv platforma axtarışda görünmür. */
export async function togglePlatformActive(key: string, isActive: boolean) {
  await requireAdmin();
  await prisma.platform.update({ where: { key }, data: { isActive } });
  revalidateStorefront();
  revalidatePath("/admin/platforms");
}

/**
 * Kateqoriyanın görünmə bayrağını dəyişir.
 * `showInNav` (yuxarı zolaq) və `showOnHome` (ana səhifə bölməsi) AYRIDIR —
 * bir kateqoriya nav-da olub home-da olmaya bilər (və əksinə).
 */
export async function toggleCategoryVisibility(
  id: string,
  field: "showInNav" | "showOnHome",
  value: boolean,
) {
  await requireAdmin();
  await prisma.platformCategory.update({
    where: { id },
    data: { [field]: value },
  });
  revalidateStorefront();
}

/** Kateqoriyanın sıra nömrəsi — zolaqda/bölmədə hansı ardıcıllıqla görünsün. */
export async function updateCategorySort(id: string, sortOrder: number) {
  await requireAdmin();
  await prisma.platformCategory.update({
    where: { id },
    data: { sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0 },
  });
  revalidateStorefront();
}

/**
 * PLATFORMANIN ANBAR ÜNVANI.
 *
 * Avto-alış çatdırılma ünvanını MƏHZ buradan götürür (`Platform.warehouse`):
 * mal İspaniyadakı anbarımıza gəlir, oradan Azərbaycana yola düşür. Ünvan
 * kodda sabit deyil — anbar köçsə və ya telefon dəyişsə deploy lazım
 * gəlməməlidir.
 *
 * Məcburi sahələr boş göndərilsə YAZILMIR: yarımçıq ünvanla sifariş vermək
 * malın İspaniyada itməsi deməkdir. Ünvanı tamamilə silmək üçün `street`
 * boş göndərilir — o zaman job "anbar təyin olunmayıb" deyib dayanır.
 */
export async function updatePlatformWarehouse(formData: FormData) {
  await requireAdmin();

  const key = String(formData.get("key") ?? "");
  const street = String(formData.get("street") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();

  if (!key) return;

  if (!street) {
    await prisma.platform.update({ where: { key }, data: { warehouse: Prisma.DbNull } });
    revalidatePath(`/admin/platforms/${key}`);
    return;
  }

  if (!postalCode || !city || !country) {
    redirect(
      `/admin/platforms/${key}?error=${encodeURIComponent(
        "Küçə, poçt indeksi, şəhər və ölkə — hamısı doldurulmalıdır.",
      )}`,
    );
  }

  await prisma.platform.update({
    where: { key },
    data: {
      warehouse: {
        ...(label ? { label } : {}),
        street,
        postalCode,
        city,
        country,
        ...(phone ? { phone } : {}),
      },
    },
  });

  revalidatePath(`/admin/platforms/${key}`);
  redirect(`/admin/platforms/${key}?ok=1`);
}

/**
 * Platforma nişanının rəngləri — məhsul kartında hansı fonla göründüyü.
 * Rənglər kodda deyil, bazadadır (qayda #4): admin brendə uyğun dəyişə bilir.
 */
export async function updatePlatformBadge(
  key: string,
  badgeBg: string,
  badgeFg: string,
) {
  await requireAdmin();

  // Yalnız hex qəbul edirik — ixtiyari CSS dəyəri inline style-a düşəcəyi üçün
  // formatı burada bağlayırıq (səhv dəyər kartı sındırmasın).
  const hex = /^#[0-9a-fA-F]{6}$/;
  const bg = hex.test(badgeBg.trim()) ? badgeBg.trim() : null;
  const fg = hex.test(badgeFg.trim()) ? badgeFg.trim() : null;
  if (!bg || !fg) return { ok: false, error: "invalid_color" };

  await prisma.platform.update({
    where: { key },
    data: { badgeBg: bg, badgeFg: fg },
  });
  revalidateStorefront();
  revalidatePath("/admin/platforms");
  return { ok: true };
}
