import { Checkbox, Field, FormGrid, FullWidth, Select, TextArea } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type Product = {
  id: string;
  name: string;
  nameAz: string | null;
  nameEn: string | null;
  nameRu: string | null;
  descAz: string | null;
  descEn: string | null;
  descRu: string | null;
  brand: string;
  description: string | null;
  priceCents: number;
  oldPriceCents: number | null;
  image: string;
  images: string | null;
  rating: number;
  reviewCount: number;
  source: string | null;
  sku: string | null;
  sourceUrl: string | null;
  sizes: string | null;
  colors: string | null;
  categoryId: string | null;
  isActive: boolean;
};

/** '["S","M"]' → "S, M" */
function jsonToCsv(value: string | null): string {
  if (!value) return "";
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.join(", ") : "";
  } catch {
    return "";
  }
}

function money(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

export function ProductForm({
  action,
  product,
  categories,
}: {
  action: (formData: FormData) => void;
  product?: Product;
  categories: { id: string; nameAz: string }[];
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {product && <input type="hidden" name="id" value={product.id} />}

        <FormGrid>
          <FullWidth>
            <Field
              name="name"
              label="Ad (ehtiyat)"
              defaultValue={product?.name}
              required
              hint="Tərcümələr boş olanda bu göstərilir."
            />
          </FullWidth>

          {/* ÜÇDİLLİ AD — müştəri MƏHZ bunları görür (qayda #5).
              Əvvəl formada yox idi: admin yuxarıdakı adı dəyişirdi, mağazada
              isə heç nə dəyişmirdi, çünki tərcümə sahələri dolu qalırdı. */}
          <Field name="nameAz" label="Ad (AZ)" defaultValue={product?.nameAz ?? ""} />
          <Field name="nameEn" label="Ad (EN)" defaultValue={product?.nameEn ?? ""} />
          <Field name="nameRu" label="Ad (RU)" defaultValue={product?.nameRu ?? ""} />
          <div />

          <Field name="brand" label="Brend" defaultValue={product?.brand} required />

          <Select
            name="categoryId"
            label="Kateqoriya"
            defaultValue={product?.categoryId ?? ""}
            options={[
              { value: "", label: "— seçilməyib —" },
              ...categories.map((category) => ({
                value: category.id,
                label: category.nameAz,
              })),
            ]}
          />

          <Field
            name="price"
            label="Qiymət ($)"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? money(product.priceCents) : ""}
          />
          <Field
            name="oldPrice"
            label="Köhnə qiymət ($)"
            type="number"
            step="0.01"
            min="0"
            hint="Endirim göstərmək üçün. Boş buraxıla bilər."
            defaultValue={product ? money(product.oldPriceCents) : ""}
          />

          <Select
            name="source"
            label="Mənbə platforma"
            defaultValue={product?.source ?? ""}
            options={[
              { value: "", label: "— seçilməyib —" },
              { value: "1688", label: "1688" },
              { value: "taobao", label: "Taobao" },
              { value: "amazon", label: "Amazon" },
              { value: "zara", label: "Zara" },
            ]}
          />
          <Field
            name="sku"
            label="SKU / artikul"
            defaultValue={product?.sku}
            hint="Tədarükçüdəki məhsul kodu."
          />

          <FullWidth>
            <Field
              name="sourceUrl"
              label="Mənbə linki"
              type="url"
              defaultValue={product?.sourceUrl}
              placeholder="https://detail.1688.com/offer/…"
              hint="Operator sifarişi buradan verir."
            />
          </FullWidth>

          <FullWidth>
            <Field
              name="image"
              label="Əsas şəkil (URL)"
              defaultValue={product?.image}
              required
              placeholder="https://…"
            />
          </FullWidth>

          <FullWidth>
            <Field
              name="images"
              label="Əlavə şəkillər"
              defaultValue={jsonToCsv(product?.images ?? null)}
              hint="URL-ləri vergüllə ayırın."
            />
          </FullWidth>

          <Field
            name="sizes"
            label="Ölçülər"
            defaultValue={jsonToCsv(product?.sizes ?? null)}
            hint="Məsələn: S, M, L, XL"
          />
          <Field
            name="colors"
            label="Rənglər"
            defaultValue={jsonToCsv(product?.colors ?? null)}
            hint="Məsələn: Qara, Ağ, Bej"
          />

          <Field
            name="rating"
            label="Reytinq"
            type="number"
            step="0.1"
            min="0"
            defaultValue={product?.rating ?? 0}
          />
          <Field
            name="reviewCount"
            label="Rəy sayı"
            type="number"
            min="0"
            defaultValue={product?.reviewCount ?? 0}
          />

          <FullWidth>
            <TextArea
              name="description"
              label="Təsvir (ehtiyat)"
              defaultValue={product?.description}
            />
            <TextArea name="descAz" label="Təsvir (AZ)" defaultValue={product?.descAz ?? ""} />
            <TextArea name="descEn" label="Təsvir (EN)" defaultValue={product?.descEn ?? ""} />
            <TextArea name="descRu" label="Təsvir (RU)" defaultValue={product?.descRu ?? ""} />
          </FullWidth>

          <FullWidth>
            <Checkbox
              name="isActive"
              label="Mağazada göstər"
              defaultChecked={product?.isActive ?? true}
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
