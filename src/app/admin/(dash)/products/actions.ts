"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseMoney } from "@/lib/format";

/** "S, M, L" → '["S","M","L"]'; boşdursa null. */
function csvToJson(value: FormDataEntryValue | null): string | null {
  const items = String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? JSON.stringify(items) : null;
}

function text(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function int(value: FormDataEntryValue | null, fallback = 0): number {
  const parsed = parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readForm(formData: FormData) {
  const oldPrice = String(formData.get("oldPrice") ?? "").trim();

  const name = String(formData.get("name") ?? "").trim();

  return {
    name,
    // ÜÇDİLLİ SAHƏLƏR (qayda #5).
    //
    // Müştəri məhz bunları görür: storefront `pickLang(nameAz/En/Ru)` ilə
    // seçir və yalnız hamısı boş olanda `name`-ə düşür. Əvvəl formada bu
    // sahələr YOX idi — admin `name`-i dəyişirdi, mağazada isə heç nə
    // dəyişmirdi, çünki tərcümə sahələri dolu qalırdı.
    //
    // Boş buraxılan dil `null` yazılır: boş sətir "tərcümə var, amma boşdur"
    // demək olardı və mağazada boş ad görünərdi.
    nameAz: text(formData.get("nameAz")),
    nameEn: text(formData.get("nameEn")),
    nameRu: text(formData.get("nameRu")),
    brand: String(formData.get("brand") ?? "").trim(),
    description: text(formData.get("description")),
    descAz: text(formData.get("descAz")),
    descEn: text(formData.get("descEn")),
    descRu: text(formData.get("descRu")),
    priceCents: parseMoney(formData.get("price")),
    oldPriceCents: oldPrice ? parseMoney(oldPrice) : null,
    image: String(formData.get("image") ?? "").trim(),
    images: csvToJson(formData.get("images")),
    rating: Number(formData.get("rating") ?? 0) || 0,
    reviewCount: int(formData.get("reviewCount")),
    source: text(formData.get("source")),
    sku: text(formData.get("sku")),
    sourceUrl: text(formData.get("sourceUrl")),
    sizes: csvToJson(formData.get("sizes")),
    colors: csvToJson(formData.get("colors")),
    isActive: formData.get("isActive") === "on",
  };
}

/** Prisma 7 xarici açarı birbaşa qəbul etmir — əlaqə connect/disconnect ilə qurulur. */
function categoryLink(formData: FormData) {
  const categoryId = text(formData.get("categoryId"));
  return categoryId
    ? { category: { connect: { id: categoryId } } }
    : { category: { disconnect: true } };
}

/** Məhsul dəyişəndə onu göstərən bütün açıq səhifələr yenilənir. */
function revalidateStorefront(id?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/");
  revalidatePath("/products");
  if (id) revalidatePath(`/products/${id}`);
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.name || !data.brand || !data.image) return;

  const categoryId = text(formData.get("categoryId"));
  await prisma.product.create({
    data: {
      ...data,
      ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
    },
  });
  revalidateStorefront();
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.name || !data.brand || !data.image) return;

  await prisma.product.update({
    where: { id },
    data: { ...data, ...categoryLink(formData) },
  });
  revalidateStorefront(id);
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.product.delete({ where: { id } });
  revalidateStorefront(id);
}
