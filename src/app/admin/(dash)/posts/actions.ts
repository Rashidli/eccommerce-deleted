"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/format";

function readForm(formData: FormData) {
  const get = (name: string) => String(formData.get(name) ?? "").trim();
  const title = get("title");
  const isPublished = formData.get("isPublished") === "on";

  return {
    title,
    slug: slugify(get("slug") || title),
    excerpt: get("excerpt") || null,
    body: get("body"),
    coverImage: get("coverImage") || null,
    isPublished,
  };
}

function revalidateStorefront(slug?: string) {
  revalidatePath("/admin/posts");
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
}

export async function createPost(formData: FormData) {
  await requireAdmin();
  const data = readForm(formData);
  if (!data.title || !data.body) return;

  await prisma.post.create({
    data: { ...data, publishedAt: data.isPublished ? new Date() : null },
  });
  revalidateStorefront(data.slug);
  redirect("/admin/posts");
}

export async function updatePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const data = readForm(formData);
  if (!id || !data.title || !data.body) return;

  const existing = await prisma.post.findUnique({
    where: { id },
    select: { publishedAt: true },
  });

  await prisma.post.update({
    where: { id },
    data: {
      ...data,
      // İlk dəfə dərc olunanda tarix qeyd olunur, sonra dəyişmir.
      publishedAt: data.isPublished
        ? (existing?.publishedAt ?? new Date())
        : null,
    },
  });
  revalidateStorefront(data.slug);
  redirect("/admin/posts");
}

export async function deletePost(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.post.delete({ where: { id } });
  revalidateStorefront();
}
