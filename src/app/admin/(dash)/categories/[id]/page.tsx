import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updateCategory } from "../actions";
import { CategoryForm } from "../category-form";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <>
      <PageHeader title={category.nameAz} subtitle="Kateqoriyanı redaktə et" />
      <CategoryForm action={updateCategory} category={category} />
    </>
  );
}
