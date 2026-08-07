import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * ÖDƏNİŞ PROVAYDERİ SƏRHƏDİ
 *
 * Sifariş məntiqi və UI heç vaxt konkret provayderi tanımır — yalnız bu
 * interfeysi görür. Real gateway qoşulanda tək iş yeni driver yazıb reyestrə
 * bir sətir əlavə etməkdir; `place-order.ts`, callback route və checkout UI
 * OLDUĞU KİMİ qalır (platforma servisləri ilə eyni prinsip — qayda #6).
 *
 * KART MƏLUMATI: heç bir driver PAN/CVV qəbul etməməli, saxlamamalı və
 * loglamamalıdır. Kart məlumatı yalnız provayderin öz hosted səhifəsində
 * daxil edilir; bizə yalnız imzalanmış nəticə qayıdır.
 */

export type PaymentSession = {
  /** İstifadəçinin yönləndiriləcəyi ünvan (provayderin hosted səhifəsi). */
  redirectUrl: string;
};

export type CallbackVerdict = {
  ok: boolean;
  /** Provayderin tranzaksiya ID-si — uğurlu yoxlamada doldurulur. */
  providerRef?: string;
  /** Uğursuzluğun səbəbi (log/diaqnostika üçün; istifadəçiyə göstərilmir). */
  reason?: string;
};

export type PaymentProvider = {
  key: string;
  /** Ödəniş sessiyası yaradır və yönləndirmə ünvanını qaytarır. */
  createSession(input: {
    paymentReference: string;
    amountCents: number;
    currency: string;
  }): Promise<PaymentSession>;
  /**
   * Callback-in HƏQİQƏTƏN provayderdən gəldiyini yoxlayır.
   * REAL PROVAYDER QOŞULANDA imza/signature yoxlaması MƏHZ BURAYA yazılır.
   */
  verifyCallback(payload: Record<string, string>): CallbackVerdict;
};

/* ------------------------------ imza (mock) ------------------------------ */

function secret(): string {
  // Ayrıca ödəniş açarı yoxdursa sessiya açarına düşür — heç olmasa imza
  // həmişə mövcud sirrlə hesablanır (boş sirr ilə imzalamaq təhlükəlidir).
  const value = process.env.PAYMENT_SECRET || process.env.SESSION_SECRET;
  if (!value) throw new Error("PAYMENT_SECRET və ya SESSION_SECRET təyin olunmayıb");
  return value;
}

/** `reference|amountCents` üzərində HMAC — məbləğ də imzalanır ki, dəyişdirilə bilməsin. */
export function signPayment(reference: string, amountCents: number): string {
  return createHmac("sha256", secret())
    .update(`${reference}|${amountCents}`)
    .digest("base64url");
}

function signatureMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Uzunluq fərqlidirsə timingSafeEqual atır — əvvəlcə yoxlanılır.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/* ------------------------------ mock driver ------------------------------ */

/**
 * Real gateway yoxdur. Bu driver istifadəçini bizim öz "provayder" səhifəmizə
 * yönləndirir; həmin səhifə KART FORMASI GÖSTƏRMİR — sadəcə imzalanmış nəticəni
 * callback-ə geri post edir. Beləliklə bütün axın (yaratma → yönləndirmə →
 * callback → təsdiq) real provayderlə eyni formada sınanır.
 */
const mockProvider: PaymentProvider = {
  key: "mock",

  async createSession({ paymentReference, amountCents }) {
    const sig = signPayment(paymentReference, amountCents);
    const params = new URLSearchParams({ sig });
    return {
      redirectUrl: `/checkout/pay/${encodeURIComponent(paymentReference)}?${params}`,
    };
  },

  verifyCallback(payload) {
    const reference = payload.reference ?? "";
    const amount = Number(payload.amountCents);
    const sig = payload.sig ?? "";

    if (!reference || !Number.isFinite(amount)) {
      return { ok: false, reason: "çatışmayan sahə" };
    }
    if (!sig || !signatureMatches(sig, signPayment(reference, amount))) {
      return { ok: false, reason: "imza uyğun deyil" };
    }
    return { ok: true, providerRef: `mock_${reference}` };
  },
};

/* -------------------------------- reyestr -------------------------------- */

const PROVIDERS: Record<string, PaymentProvider> = {
  [mockProvider.key]: mockProvider,
};

/** Aktiv provayder — `PAYMENT_PROVIDER` env dəyişəni ilə seçilir. */
export function getPaymentProvider(): PaymentProvider {
  const key = process.env.PAYMENT_PROVIDER || "mock";
  const provider = PROVIDERS[key];
  if (!provider) {
    throw new Error(`Naməlum ödəniş provayderi: ${key}`);
  }
  return provider;
}
