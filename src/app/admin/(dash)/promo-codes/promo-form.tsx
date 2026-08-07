import { Checkbox, Field, FormGrid, FullWidth, Select } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";
import { toDateInput } from "@/lib/format";

type PromoCode = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderCents: number;
  usageLimit: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

export function PromoForm({
  action,
  promo,
}: {
  action: (formData: FormData) => void;
  promo?: PromoCode;
}) {
  // Sabit endirim sentlə saxlanır, faiz isə tam ədəd kimi.
  const value = promo
    ? promo.type === "fixed"
      ? (promo.value / 100).toFixed(2)
      : String(promo.value)
    : "";

  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {promo && <input type="hidden" name="id" value={promo.id} />}

        <FormGrid>
          <Field
            name="code"
            label="Kod"
            defaultValue={promo?.code}
            required
            placeholder="YAY25"
            hint="Böyük hərflərə çevrilir."
          />
          <Select
            name="type"
            label="Endirim növü"
            defaultValue={promo?.type ?? "percent"}
            options={[
              { value: "percent", label: "Faiz (%)" },
              { value: "fixed", label: "Sabit məbləğ ($)" },
            ]}
          />

          <Field
            name="value"
            label="Dəyər"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={value}
            hint="Faiz üçün 25 = 25%, sabit üçün 3.50 = $3.50"
          />
          <Field
            name="minOrder"
            label="Minimum sifariş ($)"
            type="number"
            step="0.01"
            min="0"
            defaultValue={promo ? (promo.minOrderCents / 100).toFixed(2) : "0"}
          />

          <Field
            name="usageLimit"
            label="İstifadə limiti"
            type="number"
            min="1"
            defaultValue={promo?.usageLimit ?? ""}
            hint="Boş = limitsiz."
          />
          <div />

          <Field
            name="startsAt"
            label="Başlama tarixi"
            type="date"
            defaultValue={toDateInput(promo?.startsAt ?? null)}
          />
          <Field
            name="expiresAt"
            label="Bitmə tarixi"
            type="date"
            defaultValue={toDateInput(promo?.expiresAt ?? null)}
          />

          <FullWidth>
            <Checkbox
              name="isActive"
              label="Aktiv"
              defaultChecked={promo?.isActive ?? true}
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
