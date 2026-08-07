import { Checkbox, Field, FormGrid, FullWidth } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type Slide = {
  id: string;
  titleAz: string;
  titleEn: string;
  titleRu: string;
  subtitle: string | null;
  image: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

export function SlideForm({
  action,
  slide,
}: {
  action: (formData: FormData) => void;
  slide?: Slide;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {slide && <input type="hidden" name="id" value={slide.id} />}

        <FormGrid>
          <Field name="titleAz" label="Başlıq (AZ)" defaultValue={slide?.titleAz} required />
          <Field name="subtitle" label="Alt başlıq" defaultValue={slide?.subtitle} />
          <Field name="titleEn" label="Başlıq (EN)" defaultValue={slide?.titleEn} />
          <Field name="titleRu" label="Başlıq (RU)" defaultValue={slide?.titleRu} />

          <FullWidth>
            <Field name="image" label="Şəkil (URL)" defaultValue={slide?.image} required />
          </FullWidth>

          <Field name="href" label="Keçid" defaultValue={slide?.href ?? "/products"} />
          <Field name="sortOrder" label="Sıra" type="number" defaultValue={slide?.sortOrder ?? 0} />

          <FullWidth>
            <Checkbox
              name="isActive"
              label="Slayderdə göstər"
              defaultChecked={slide?.isActive ?? true}
            />
          </FullWidth>
        </FormGrid>

        <div className="flex gap-2 border-t border-border pt-4">
          <SubmitButton />
          <CancelButton />
        </div>
      </form>
    </Card>
  );
}
