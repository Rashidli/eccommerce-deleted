import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * ÖDƏNİŞİ TƏSDİQLƏ — IDEMPOTENT.
 *
 * Provayderlər callback-i təkrar göndərir (retry, istifadəçinin geri düyməsi,
 * şəbəkə təkrarı). Ona görə keçid "yalnız `pending` olanı `paid` et" şəklində,
 * ŞƏRTLİ YAZMA ilə aparılır: `updateMany({where: {status:"pending"}})`.
 * İkinci çağırışda `count === 0` gəlir və heç nə tətbiq olunmur —
 * `findUnique` + `if` yoxlaması ilə paralel iki callback arasında yarış
 * (race) yaranardı, bu üsulda isə qərarı baza verir.
 */

export type MarkPaidResult =
  | { ok: true; orderReference: string; alreadyPaid: boolean }
  | { ok: false; reason: "not_found" | "amount_mismatch" };

export async function markPaymentPaid(input: {
  reference: string;
  amountCents: number;
  providerRef?: string;
}): Promise<MarkPaidResult> {
  const payment = await prisma.payment.findUnique({
    where: { reference: input.reference },
    select: {
      id: true,
      orderId: true,
      amountCents: true,
      status: true,
      order: { select: { reference: true } },
    },
  });
  if (!payment) return { ok: false, reason: "not_found" };

  // İmza məbləği də əhatə edir, amma DB ilə də tutuşdururuq: imzalanmış, lakin
  // BAŞQA sifarişin məbləği ilə gələn callback qəbul olunmamalıdır.
  if (payment.amountCents !== input.amountCents) {
    return { ok: false, reason: "amount_mismatch" };
  }

  const now = new Date();

  const applied = await prisma.$transaction(async (tx) => {
    // Şərtli yazma — keçidi yalnız BİR çağırış qazanır.
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: { status: "paid", paidAt: now, providerRef: input.providerRef ?? null },
    });
    if (claimed.count === 0) return false;

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        isPaid: true,
        paidAt: now,
        // Ödənişdən SONRA sifariş operator üçün işə düşür.
        status: "processing",
      },
    });
    return true;
  });

  return {
    ok: true,
    orderReference: payment.order.reference,
    alreadyPaid: !applied,
  };
}
