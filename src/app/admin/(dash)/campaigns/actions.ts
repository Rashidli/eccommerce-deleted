"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";

function readForm(formData: FormData) {
  const get = (name: string) => String(formData.get(name) ?? "").trim();
  const sortOrder = parseInt(get("sortOrder") || "0", 10);

  return {
    key: slugify(get("key") || get("titleAz")),
    eyebrowAz: get("eyebrowAz"),
    eyebrowEn: get("eyebrowEn") || get("eyebrowAz"),
    eyebrowRu: get("eyebrowRu") || get("eyebrowAz"),
    titleAz: get("titleAz"),
    titleEn: get("titleEn") || get("titleAz"),
    titleRu: get("titleRu") || get("titleAz"),
    ctaAz: get("ctaAz"),
    ctaEn: get("ctaEn") || get("ctaAz"),
    ctaRu: get("ctaRu") || get("ctaAz"),
    href: get("href") || "/products",
    image: get("image"),
    tint: get("tint") || "bg-secondary",
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive: formData.get("isActive") === "on",
  };
}

function revalidateStorefront() {
  revalidatePath("/admin/campaigns");
  revalidatePath("/");
}

export async function createCampaign(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.titleAz || !data.image) return;

  await prisma.campaign.create({ data });
  revalidateStorefront();
  redirect("/admin/campaigns");
}

export async function updateCampaign(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.titleAz || !data.image) return;

  await prisma.campaign.update({ where: { id }, data });
  revalidateStorefront();
  redirect("/admin/campaigns");
}

export async function deleteCampaign(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.campaign.delete({ where: { id } });
  revalidateStorefront();
}
