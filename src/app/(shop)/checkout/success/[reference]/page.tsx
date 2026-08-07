import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { OrderConfirmation } from "./confirmation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Ödənişdən sonrakı təsdiq səhifəsi — yalnız sifarişin sahibi görür. */
export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/panel/orders")}`);

  const order = await prisma.order.findUnique({
    where: { reference },
    select: {
      reference: true,
      userId: true,
      isPaid: true,
      totalCents: true,
      courier: true,
      branch: true,
      items: { select: { id: true, name: true, quantity: true, priceCents: true } },
    },
  });

  // Başqasının sifarişi də "tapılmadı" kimi qaytarılır — mövcudluğu sızmasın.
  if (!order || order.userId !== user.id) notFound();

  return (
    <OrderConfirmation
      reference={order.reference}
      isPaid={order.isPaid}
      totalCents={order.totalCents}
      courier={order.courier}
      branch={order.branch}
      items={order.items}
    />
  );
}
