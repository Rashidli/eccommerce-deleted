import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/user-session";
import { signPayment } from "@/lib/orders/payment-provider";
import { MockGateway } from "./mock-gateway";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * MOCK ÖDƏNİŞ PROVAYDERİNİN "hosted" SƏHİFƏSİ
 *
 * Real gateway qoşulanda bu route silinir — istifadəçi birbaşa provayderin
 * domenine gedir. Ona qədər axın eyni formada sınanır: yönləndirmə → təsdiq →
 * imzalanmış callback.
 *
 * BURADA KART FORMASI YOXDUR və olmamalıdır. Kart nömrəsi/CVV heç vaxt bizim
 * sistemə düşmür — bu, PCI baxımından qəsdən verilmiş qərardır.
 */
export default async function MockPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ reference: string }>;
  searchParams: Promise<{ sig?: string }>;
}) {
  const { reference } = await params;
  const { sig } = await searchParams;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/checkout")}`);

  const payment = await prisma.payment.findUnique({
    where: { reference },
    select: {
      reference: true,
      amountCents: true,
      status: true,
      order: { select: { reference: true, userId: true } },
    },
  });
  if (!payment) notFound();

  // Yalnız sifarişin sahibi ödəniş səhifəsini görə bilər — başqasının
  // sifarişinin məbləği kənara çıxmasın (callback onsuz da imza ilə qorunur).
  if (payment.order.userId !== user.id) notFound();

  // Yönləndirmənin həqiqətən `createSession`-dan gəldiyini təsdiqləyir.
  const expected = signPayment(payment.reference, payment.amountCents);
  if (sig !== expected) notFound();

  // Artıq ödənilibsə təkrar təsdiq səhifəsi göstərmirik.
  if (payment.status === "paid") {
    redirect(`/checkout/success/${encodeURIComponent(payment.order.reference)}`);
  }

  return (
    <MockGateway
      reference={payment.reference}
      amountCents={payment.amountCents}
      orderReference={payment.order.reference}
      signature={expected}
    />
  );
}
