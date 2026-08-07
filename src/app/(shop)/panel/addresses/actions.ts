"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/user-session";

/**
 * Ünvan CRUD.
 *
 * Hər əməliyyat `userId` ilə məhdudlaşır — id-ni bilən başqa istifadəçi
 * ünvanı oxuya/silə/dəyişə bilməməlidir (IDOR qorunması).
 * Rayon kuryer TARİFİNİ təyin edir, ona görə seçim serverdə yoxlanılır.
 */

export type AddressState = {
  error?: string;
  ok?: boolean;
  /**
   * İstifadəçinin YAZDIQLARI — xəta olanda forma bunlarla yenidən doldurulur.
   *
   * Server action-dan sonra forma yenidən render olunur və `defaultValue`-lu
   * input-lar boşalır: "Şəhər və rayon seçin" xətasında ad, telefon, ünvan
   * sətri — hamısı silinirdi və istifadəçi hər şeyi yenidən yazmalı olurdu.
   */
  values?: AddressValues;
};

export type AddressValues = {
  label: string;
  fullName: string;
  phone: string;
  line: string;
  cityId: string;
  districtId: string;
};

/** Rayonun mövcud və seçilmiş şəhərə aid olduğunu təsdiqləyir. */
async function validDistrict(
  cityId: string,
  districtId: string,
): Promise<boolean> {
  if (!cityId || !districtId) return false;
  const d = await prisma.district.findFirst({
    where: { id: districtId, cityId, isActive: true, city: { isActive: true } },
    select: { id: true },
  });
  return Boolean(d);
}

function read(formData: FormData): AddressValues {
  return {
    label: String(formData.get("label") ?? "").trim(),
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    line: String(formData.get("line") ?? "").trim(),
    cityId: String(formData.get("cityId") ?? "").trim(),
    districtId: String(formData.get("districtId") ?? "").trim(),
  };
}

export async function addAddress(
  _prev: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const user = await requireUser();
  const v = read(formData);

  if (!v.label || !v.fullName || !v.phone || !v.line) {
    return { error: "missingFields", values: v };
  }
  // Şəhər/rayon MƏCBURİDİR — onsuz kuryer tarifi hesablana bilmir.
  if (!(await validDistrict(v.cityId, v.districtId))) {
    return { error: "missingRegion", values: v };
  }

  const count = await prisma.address.count({ where: { userId: user.id } });
  await prisma.address.create({
    data: {
      userId: user.id,
      label: v.label,
      fullName: v.fullName,
      phone: v.phone,
      line: v.line,
      cityId: v.cityId,
      districtId: v.districtId,
      isDefault: count === 0, // ilk ünvan avtomatik əsas olur
    },
  });

  revalidatePath("/panel/addresses");
  revalidatePath("/panel");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function updateAddress(
  _prev: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const v = read(formData);

  if (!id) return { error: "missingFields", values: v };
  if (!v.label || !v.fullName || !v.phone || !v.line) {
    return { error: "missingFields", values: v };
  }
  if (!(await validDistrict(v.cityId, v.districtId))) {
    return { error: "missingRegion", values: v };
  }

  // `updateMany` + userId — başqasının ünvanı heç vaxt dəyişdirilmir.
  const res = await prisma.address.updateMany({
    where: { id, userId: user.id },
    data: {
      label: v.label,
      fullName: v.fullName,
      phone: v.phone,
      line: v.line,
      cityId: v.cityId,
      districtId: v.districtId,
    },
  });
  if (res.count === 0) return { error: "notFound", values: v };

  revalidatePath("/panel/addresses");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function deleteAddress(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  const removed = await prisma.address.findFirst({
    where: { id, userId: user.id },
    select: { isDefault: true },
  });
  if (!removed) return;

  await prisma.$transaction(async (tx) => {
    await tx.address.deleteMany({ where: { id, userId: user.id } });

    // Əsas ünvan silinibsə, qalanlardan biri əsas olmalıdır — əks halda
    // checkout-da heç nə seçili gəlmir.
    if (removed.isDefault) {
      const next = await tx.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (next) {
        await tx.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  });

  revalidatePath("/panel/addresses");
  revalidatePath("/panel");
  revalidatePath("/checkout");
}

export async function setDefaultAddress(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");

  // Yalnız BİR əsas ünvan ola bilər — köhnəsi eyni tranzaksiyada söndürülür,
  // yoxsa aralıqda iki əsas ünvan görünə bilər.
  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    }),
    prisma.address.updateMany({
      where: { id, userId: user.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/panel/addresses");
  revalidatePath("/checkout");
}
