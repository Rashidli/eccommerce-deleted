import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updatePost } from "../actions";
import { PostForm } from "../post-form";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <>
      <PageHeader title={post.title} subtitle="Yazını redaktə et" />
      <PostForm action={updatePost} post={post} />
    </>
  );
}
