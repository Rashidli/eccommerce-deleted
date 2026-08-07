import { Checkbox, Field, FormGrid, FullWidth, Select } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type Campaign = {
  id: string;
  key: string;
  eyebrowAz: string;
  eyebrowEn: string;
  eyebrowRu: string;
  titleAz: string;
  titleEn: string;
  titleRu: string;
  ctaAz: string;
  ctaEn: string;
  ctaRu: string;
  href: string;
  image: string;
  tint: string;
  sortOrder: number;
  isActive: boolean;
};

const TINTS = [
  { value: "bg-peach", label: "Şaftalı" },
  { value: "bg-mint", label: "Nanə" },
  { value: "bg-lilac", label: "Lilac" },
  { value: "bg-secondary", label: "Neytral" },
];

export function CampaignForm({
  action,
  campaign,
}: {
  action: (formData: FormData) => void;
  campaign?: Campaign;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {campaign && <input type="hidden" name="id" value={campaign.id} />}

        <FormGrid>
          <Field name="titleAz" label="Başlıq (AZ)" defaultValue={campaign?.titleAz} required />
          <Field
            name="key"
            label="Açar"
            defaultValue={campaign?.key}
            hint="Boş buraxsanız başlıqdan yaradılır."
          />
          <Field name="titleEn" label="Başlıq (EN)" defaultValue={campaign?.titleEn} />
          <Field name="titleRu" label="Başlıq (RU)" defaultValue={campaign?.titleRu} />

          <Field name="eyebrowAz" label="Üst mətn (AZ)" defaultValue={campaign?.eyebrowAz} />
          <Field name="eyebrowEn" label="Üst mətn (EN)" defaultValue={campaign?.eyebrowEn} />
          <Field name="eyebrowRu" label="Üst mətn (RU)" defaultValue={campaign?.eyebrowRu} />
          <div />

          <Field name="ctaAz" label="Düymə (AZ)" defaultValue={campaign?.ctaAz} />
          <Field name="ctaEn" label="Düymə (EN)" defaultValue={campaign?.ctaEn} />
          <Field name="ctaRu" label="Düymə (RU)" defaultValue={campaign?.ctaRu} />
          <Field
            name="href"
            label="Keçid"
            defaultValue={campaign?.href ?? "/products"}
            placeholder="/sale"
          />

          <FullWidth>
            <Field name="image" label="Şəkil (URL)" defaultValue={campaign?.image} required />
          </FullWidth>

          <Select
            name="tint"
            label="Fon rəngi"
            defaultValue={campaign?.tint ?? "bg-secondary"}
            options={TINTS}
          />
          <Field
            name="sortOrder"
            label="Sıra"
            type="number"
            defaultValue={campaign?.sortOrder ?? 0}
          />

          <FullWidth>
            <Checkbox
              name="isActive"
              label="Ana səhifədə göstər"
              defaultChecked={campaign?.isActive ?? true}
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
