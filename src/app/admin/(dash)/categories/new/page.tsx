import { PageHeader } from "@/components/admin/ui";
import { createCategory } from "../actions";
import { CategoryForm } from "../category-form";

export default function NewCategoryPage() {
  return (
    <>
      <PageHeader title="Yeni kateqoriya" />
      <CategoryForm action={createCategory} />
    </>
  );
}
