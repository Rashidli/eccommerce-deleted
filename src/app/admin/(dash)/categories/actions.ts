"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";

function readForm(formData: FormData) {
  const nameAz = String(formData.get("nameAz") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const sortOrder = parseInt(String(formData.get("sortOrder") ?? "0"), 10);

  return {
    slug: slug ? slugify(slug) : slugify(nameAz),
    nameAz,
    nameEn: String(formData.get("nameEn") ?? "").trim() || nameAz,
    nameRu: String(formData.get("nameRu") ?? "").trim() || nameAz,
    image: image || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
  };
}

function revalidateStorefront() {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/categories");
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.nameAz || !data.slug) return;

  await prisma.category.create({ data });
  revalidateStorefront();
  redirect("/admin/categories");
}

export async function updateCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.nameAz || !data.slug) return;

  await prisma.category.update({ where: { id }, data });
  revalidateStorefront();
  redirect("/admin/categories");
}

export async function deleteCategory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Məhsullar silinmir — sxemdə categoryId `SetNull`-dur.
  await prisma.category.delete({ where: { id } });
  revalidateStorefront();
}
