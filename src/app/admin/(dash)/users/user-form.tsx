import { Field, FormGrid, Select } from "@/components/admin/fields";
import { CancelButton, SubmitButton } from "@/components/admin/form-actions";
import { Card } from "@/components/admin/ui";

type User = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  fin: string | null;
  customerCode: string | null;
  customerNo: number;
  role: string;
};

export function UserForm({
  action,
  user,
}: {
  action: (formData: FormData) => void;
  user?: User;
}) {
  return (
    <Card className="p-5">
      <form action={action} className="space-y-5">
        {user && <input type="hidden" name="id" value={user.id} />}

        <FormGrid>
          <Field
            name="fullName"
            label="Ad Soyad"
            defaultValue={user?.fullName}
            required
            placeholder="Umid Ismayilov"
            hint="Zara sifarişində alıcı adı kimi bu yazılır."
          />
          <Field
            name="email"
            label="E-poçt"
            type="email"
            defaultValue={user?.email}
            required
          />

          <Field name="phone" label="Telefon" defaultValue={user?.phone ?? ""} />
          <Field
            name="fin"
            label="FİN"
            defaultValue={user?.fin ?? ""}
            hint="Şəxsiyyət vəsiqəsinin 7 simvollu kodu. Unikaldır."
          />

          <Field
            name="customerCode"
            label="Müştəri kodu"
            defaultValue={user?.customerCode ?? ""}
            placeholder={user ? undefined : "boş buraxsanız baza özü yaradır"}
            hint={
              user
                ? `Müştəri nömrəsi: ${user.customerNo}. Bu kod Zara ünvanında mənzil sahəsinə yazılır — anbarımız paketi bununla tanıyır.`
                : "Boş buraxılsa baza avtomatik FOR000001 formatında yaradır."
            }
          />
          <Select
            name="role"
            label="Rol"
            defaultValue={user?.role ?? "customer"}
            options={[
              { value: "customer", label: "Müştəri" },
              { value: "admin", label: "Admin" },
            ]}
          />

          {/* Şifrə YALNIZ yaratmada burada olur. Redaktədə ayrıca forma var —
              belə olanda "yadda saxla" düyməsi təsadüfən şifrəni sıfırlamır. */}
          {!user && (
            <Field
              name="password"
              label="Şifrə"
              type="password"
              hint="Boş buraxsanız hesab şifrəsiz yaranır (müştəri özü təyin edər)."
            />
          )}
        </FormGrid>

        <div className="flex gap-2 border-t border-border pt-4">
          <SubmitButton />
          <CancelButton />
        </div>
      </form>
    </Card>
  );
}
