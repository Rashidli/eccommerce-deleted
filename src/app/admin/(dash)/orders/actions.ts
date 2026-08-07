"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

export async function updateOrder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.includes(status)) return;

  const tracking = String(formData.get("tracking") ?? "").trim();
  const courier = String(formData.get("courier") ?? "").trim();
  const branch = String(formData.get("branch") ?? "").trim();

  await prisma.order.update({
    where: { id },
    data: {
      status,
      tracking: tracking || null,
      courier: courier || null,
      branch: branch || null,
      // Çatdırılma tarixi yalnız status "delivered" olanda qeyd olunur.
      deliveryDate: status === "delivered" ? new Date() : null,
    },
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/panel/orders");
}

/** Operator tədarükçüdən aldıqdan sonra sətrin kodlarını doldurur. */
export async function updateOrderItem(formData: FormData) {
  await requireAdmin();
  const itemId = String(formData.get("itemId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!itemId || !orderId) return;

  const trackingCode = String(formData.get("trackingCode") ?? "").trim();
  const deliveryCode = String(formData.get("deliveryCode") ?? "").trim();
  const purchased = formData.get("purchased") === "on";

  // VARİANT ƏL İLƏ DÜZƏLDİLƏ BİLİR.
  //
  // Adətən müştərinin seçimi checkout-da yazılır. Amma köhnə sifarişlərdə bu
  // sahə hələ yox idi, bəzən də məhsulun variant ağacı sonrakı idxalda
  // itirdi. Ölçüsüz sətri Zara-dan almaq MÜMKÜN DEYİL — ona görə operator
  // müştəri ilə dəqiqləşdirib buradan yaza bilməlidir.
  const size = String(formData.get("size") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim();

  const existing = await prisma.orderItem.findUnique({
    where: { id: itemId },
    select: { purchasedAt: true },
  });

  await prisma.orderItem.update({
    where: { id: itemId },
    data: {
      trackingCode: trackingCode || null,
      deliveryCode: deliveryCode || null,
      size: size || null,
      color: color || null,
      // Alış tarixi bir dəfə qeyd olunur; işarə götürülsə silinir.
      purchasedAt: purchased ? (existing?.purchasedAt ?? new Date()) : null,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
}
