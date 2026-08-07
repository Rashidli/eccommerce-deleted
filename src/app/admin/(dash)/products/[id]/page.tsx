import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updateProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameAz: true },
    }),
  ]);

  if (!product) notFound();

  return (
    <>
      <PageHeader title={product.name} subtitle="Məhsulu redaktə et" />
      <ProductForm action={updateProduct} product={product} categories={categories} />
    </>
  );
}
