import { NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site-url";
import { revalidatePath } from "next/cache";
import { getPaymentProvider } from "@/lib/orders/payment-provider";
import { markPaymentPaid } from "@/lib/orders/mark-paid";

/**
 * ÖDƏNİŞ CALLBACK-i
 *
 * Provayder ödənişin nəticəsini bura göndərir. Ardıcıllıq dəyişməzdir:
 *   1) İMZANI YOXLA  → 2) məbləği DB ilə tutuşdur → 3) idempotent təsdiq
 *
 * Yoxlanmamış callback HEÇ VAXT "ödənildi" saymır: əks halda bu ünvana sadə
 * bir POST atmaqla istənilən sifarişi pulsuz ödənilmiş etmək olardı.
 * Real provayder qoşulanda onun imza yoxlaması driver-in `verifyCallback`
 * metoduna yazılır — buradakı axın dəyişmir.
 */

async function readPayload(request: Request): Promise<Record<string, string>> {
  const type = request.headers.get("content-type") ?? "";

  if (type.includes("application/json")) {
    try {
      const body: unknown = await request.json();
      if (!body || typeof body !== "object") return {};
      return Object.fromEntries(
        Object.entries(body as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
      );
    } catch {
      return {};
    }
  }

  // form-urlencoded / multipart (mock səhifə form ilə göndərir)
  try {
    const form = await request.formData();
    return Object.fromEntries(
      Array.from(form.entries()).map(([k, v]) => [k, String(v)]),
    );
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  const payload = await readPayload(request);
  const provider = getPaymentProvider();

  // 1) İmza — hər şeydən əvvəl.
  const verdict = provider.verifyCallback(payload);
  if (!verdict.ok) {
    // Səbəb istifadəçiyə qaytarılmır (imza detalını sızdırmamaq üçün).
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // 2) + 3) Məbləğ yoxlanışı və idempotent keçid.
  const result = await markPaymentPaid({
    reference: payload.reference,
    amountCents: Number(payload.amountCents),
    providerRef: verdict.providerRef,
  });

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  revalidatePath("/panel/orders");
  revalidatePath("/admin/orders");

  // PUBLIC URL — `request.url` nginx arxasında 127.0.0.1:3100 verir və
  // istifadəçini `localhost`-a yönləndirirdi.
  const url = absoluteUrl(
    `/checkout/success/${encodeURIComponent(result.orderReference)}`,
  );

  // 303: POST-dan sonra brauzer GET ilə getsin (təkrar göndərmə olmasın).
  return NextResponse.redirect(url, 303);
}
