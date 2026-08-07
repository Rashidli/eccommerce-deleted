import { Field, FormGrid, FullWidth } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type Category = {
  id: string;
  slug: string;
  nameAz: string;
  nameEn: string;
  nameRu: string;
  image: string | null;
  sortOrder: number;
};

export function CategoryForm({
  action,
  category,
}: {
  action: (formData: FormData) => void;
  category?: Category;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {category && <input type="hidden" name="id" value={category.id} />}

        <FormGrid>
          <Field name="nameAz" label="Ad (AZ)" defaultValue={category?.nameAz} required />
          <Field
            name="slug"
            label="Slug"
            defaultValue={category?.slug}
            hint="Boş buraxsanız addan yaradılacaq."
          />
          <Field name="nameEn" label="Ad (EN)" defaultValue={category?.nameEn} />
          <Field name="nameRu" label="Ad (RU)" defaultValue={category?.nameRu} />

          <FullWidth>
            <Field name="image" label="Şəkil (URL)" defaultValue={category?.image} />
          </FullWidth>

          <Field
            name="sortOrder"
            label="Sıra"
            type="number"
            defaultValue={category?.sortOrder ?? 0}
            hint="Kiçik rəqəm əvvəl göstərilir."
          />
        </FormGrid>

        <div className="flex gap-2 border-t border-border pt-4">
          <SubmitButton />
          <CancelButton />
        </div>
      </form>
    </Card>
  );
}
