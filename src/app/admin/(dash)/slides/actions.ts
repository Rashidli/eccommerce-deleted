"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function readForm(formData: FormData) {
  const get = (name: string) => String(formData.get(name) ?? "").trim();
  const sortOrder = parseInt(get("sortOrder") || "0", 10);

  return {
    titleAz: get("titleAz"),
    titleEn: get("titleEn") || get("titleAz"),
    titleRu: get("titleRu") || get("titleAz"),
    subtitle: get("subtitle") || null,
    image: get("image"),
    href: get("href") || "/products",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get("isActive") === "on",
  };
}

function revalidateStorefront() {
  revalidatePath("/admin/slides");
  revalidatePath("/");
}

export async function createSlide(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.titleAz || !data.image) return;

  await prisma.slide.create({ data });
  revalidateStorefront();
  redirect("/admin/slides");
}

export async function updateSlide(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.titleAz || !data.image) return;

  await prisma.slide.update({ where: { id }, data });
  revalidateStorefront();
  redirect("/admin/slides");
}

export async function deleteSlide(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.slide.delete({ where: { id } });
  revalidateStorefront();
}
