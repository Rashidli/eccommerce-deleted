import { PageHeader } from "@/components/admin/ui";
import { createPromoCode } from "../actions";
import { PromoForm } from "../promo-form";

export default function NewPromoCodePage() {
  return (
    <>
      <PageHeader title="Yeni promo kod" />
      <PromoForm action={createPromoCode} />
    </>
  );
}
