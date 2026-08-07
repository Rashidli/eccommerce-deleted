"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseMoney } from "@/lib/format";

/**
 * Yerli çatdırılma idarəsi — rayon tarifləri və PUDO məntəqələri.
 *
 * Qayda #1: yalnız admin sessiyası (`requireAdmin`), customer auth-dan ayrı.
 * Qayda #4: tariflər kodda deyil, bazadadır — burada dəyişilir.
 */

function revalidateDelivery() {
  revalidatePath("/admin/delivery");
  // Müştəri tərəfi dərhal yeni tarifi görsün.
  revalidatePath("/checkout");
  revalidatePath("/panel/addresses");
}

/**
 * YENİ PUDO MƏNTƏQƏSİ.
 *
 * Məntəqələr əvvəl yalnız seed ilə yaranırdı — yeni məntəqə açmaq üçün
 * deploy lazım idi. Qayda #4-ə görə bu, admin işidir.
 *
 * Ad üç dildə istənilir: müştəri məntəqəni öz dilində görməlidir. Boş
 * qalanlar Azərbaycan adı ilə doldurulur ki, heç bir dildə boş ad çıxmasın.
 */
export async function createPickupPoint(formData: FormData) {
  await requireAdmin();

  const nameAz = String(formData.get("nameAz") ?? "").trim();
  const cityId = String(formData.get("cityId") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  if (!nameAz || !cityId || !address) return;

  // Kod unikaldır — verilməyibsə addan yaradılır və toqquşarsa sonuna say əlavə olunur.
  const base =
    String(formData.get("code") ?? "").trim().toUpperCase() ||
    nameAz
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24);

  let code = base || "PUDO";
  for (let i = 2; await prisma.pickupPoint.findUnique({ where: { code } }); i++) {
    code = `${base}-${i}`;
  }

  const districtId = String(formData.get("districtId") ?? "").trim();

  await prisma.pickupPoint.create({
    data: {
      code,
      nameAz,
      nameEn: String(formData.get("nameEn") ?? "").trim() || nameAz,
      nameRu: String(formData.get("nameRu") ?? "").trim() || nameAz,
      cityId,
      districtId: districtId || null,
      address,
      workHours: String(formData.get("workHours") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      priceCents: parseMoney(formData.get("price")),
      isActive: true,
    },
  });

  revalidateDelivery();
}

/**
 * MƏNTƏQƏNİ SİLİR.
 *
 * SİFARİŞİ OLAN məntəqə SİLİNMİR: `Order.pickupPointId` həmin sətrə baxır və
 * silinsə müştərinin sifarişində "hara gedəcəyi" itir. Belə halda düzgün yol
 * məntəqəni deaktiv etməkdir — yeni sifarişlərdə görünmür, köhnələr salamat
 * qalır.
 */
export async function deletePickupPoint(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const used = await prisma.order.count({ where: { pickupPointId: id } });
  if (used > 0) {
    // Sükutla deaktiv edirik — silmək mümkün deyil, amma admin-in niyyəti
    // "bu məntəqə artıq işləməsin"dir.
    await prisma.pickupPoint.update({ where: { id }, data: { isActive: false } });
    revalidateDelivery();
    return;
  }

  await prisma.pickupPoint.delete({ where: { id } });
  revalidateDelivery();
}

/**
 * Rayonun kuryer tarifi — məbləğ və ya "pulsuz".
 *
 * İKİ SƏVİYYƏ VAR:
 *   · `companyId` boşdursa → rayonun ÜMUMİ tarifi (`District`) yazılır.
 *     Bu, heç bir şirkət tarifi olmayanda işləyən ehtiyat qiymətdir.
 *   · `companyId` verilibsə → HƏMİN ŞİRKƏTİN tarifi (`DistrictTariff`).
 *     Şirkətlər eyni rayona eyni qiymətə getmir.
 *
 * Şirkət tarifini boş məbləğlə saxlamaq onu SİLİR — beləcə "bu şirkət üçün
 * xüsusi qiymət yoxdur, ümumi tarif işləsin" demək mümkündür.
 */
export async function saveDistrictTariff(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const companyId = String(formData.get("companyId") ?? "").trim();
  const isFree = formData.get("isFree") === "on";
  const isActive = formData.get("isActive") === "on";
  const raw = String(formData.get("price") ?? "").trim();

  if (!companyId) {
    await prisma.district.update({
      where: { id },
      data: {
        // Pulsuz işarələnibsə məbləğ saxlanılır (admin geri qaytara bilsin),
        // amma hesablamada `isFree` üstündür.
        priceCents: parseMoney(formData.get("price")),
        isFree,
        isActive,
      },
    });
    revalidateDelivery();
    return;
  }

  // Şirkət tarifi: boş məbləğ = "xüsusi qiymət yoxdur" → sətri silirik.
  if (!raw) {
    await prisma.districtTariff.deleteMany({ where: { companyId, districtId: id } });
    revalidateDelivery();
    return;
  }

  const priceCents = parseMoney(raw);
  await prisma.districtTariff.upsert({
    where: { companyId_districtId: { companyId, districtId: id } },
    create: { companyId, districtId: id, priceCents, isFree, isActive },
    update: { priceCents, isFree, isActive },
  });

  revalidateDelivery();
}

/** Şəhəri aktiv/deaktiv edir — deaktiv şəhər seçim siyahısında görünmür. */
export async function toggleCity(id: string, isActive: boolean) {
  await requireAdmin();
  await prisma.city.update({ where: { id }, data: { isActive } });
  revalidateDelivery();
}

/** PUDO məntəqəsinin haqqı və aktivliyi. */
export async function savePickupPoint(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.pickupPoint.update({
    where: { id },
    data: {
      priceCents: parseMoney(formData.get("price")),
      workHours: String(formData.get("workHours") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      isActive: formData.get("isActive") === "on",
    },
  });

  revalidateDelivery();
}
