import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameAz: true },
  });

  return (
    <>
      <PageHeader title="Yeni məhsul" subtitle="Mağazaya məhsul əlavə et" />
      <ProductForm action={createProduct} categories={categories} />
    </>
  );
}
