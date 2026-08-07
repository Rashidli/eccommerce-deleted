import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { updatePromoCode } from "../actions";
import { PromoForm } from "../promo-form";

export default async function EditPromoCodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) notFound();

  return (
    <>
      <PageHeader
        title={promo.code}
        subtitle={`${promo.usedCount} dəfə istifadə olunub`}
      />
      <PromoForm action={updatePromoCode} promo={promo} />
    </>
  );
}
