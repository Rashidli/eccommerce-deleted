import "server-only";

/**
 * Zara checkout brauzerinin ÖRTÜYÜ (job üçün).
 *
 * `zara-scraper` servisinin verdiyi endpointlər:
 *     GET  /checkout/status
 *     GET  /checkout/address-form
 *     POST /checkout/fill-address
 *     GET  /checkout/shipping-options
 *     GET  /checkout/cart
 *     POST /checkout/cart/add
 *     POST /checkout/cart/clear
 *     POST /checkout/pay
 *
 * TARİXÇƏ: bu fayl bir müddət `cart/*` və `pay` üçün "unsupported" qaytarırdı,
 * çünki yazılanda scraper-də yalnız dörd endpoint vardı. Onlar sonradan
 * əlavə olunub — indi hamısı real çağırılır.
 *
 * ÖDƏNİŞ QƏSDƏN AYRIDIR: `payOrder` yalnız `confirm: true` göndərəndə pul
 * hərəkət etdirir. Job default olaraq ödənişi HAZIRLAYIR və dayanır —
 * "Google Pay"-ə operator özü basır.
 */

const BASE = (process.env.ZARA_API_URL ?? "").replace(/\/+$/, "");
const TOKEN = process.env.ZARA_API_TOKEN ?? "";

export type Unsupported = {
  ok: false;
  unsupported: true;
  /** Hansı endpoint çatışmır — hesabatda göstərilir. */
  missing: string;
  message: string;
};

export type CheckoutStatus = {
  loggedIn: boolean;
  url: string;
  title?: string;
  orderTotal?: string;
  onSensitivePage?: boolean;
  user?: { name?: string; email?: string };
};

/**
 * Sorğu vaxtı.
 *
 * Bu endpointlərin arxasında REAL BRAUZER var: səbəti təmizləmək üçün
 * səhifəyə keçid, sətirlərin bir-bir silinməsi və yenidən oxunması lazımdır.
 * 90 saniyə az idi — `cart/clear` canlı icrada timeout verdi və job ilk
 * addımda dayandı. Şəbəkə gecikməsi deyil, işin özü uzundur.
 */
const CALL_TIMEOUT_MS = 240_000;

async function call<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  if (!BASE) return { ok: false, message: "ZARA_API_URL təyin olunmayıb" };
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(CALL_TIMEOUT_MS),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) {
      // Scraper uğursuzluqda `success:false` + `data.reason`/`data.error`
      // qaytarır. Əvvəl yalnız `body.error`-a baxılırdı və jurnalda quru
      // "HTTP 200" görünürdü — səbəb itirdi.
      const d = body?.data as
        | { reason?: string; error?: string; pageColor?: string }
        | undefined;
      const detail = [d?.reason, d?.error, body?.error]
        .filter(Boolean)
        .join(" · ");
      return {
        ok: false,
        message: `${path} → HTTP ${res.status}${detail ? ` · ${detail}` : ""}`,
      };
    }
    return { ok: true, data: (body.data ?? body) as T };
  } catch (e) {
    return { ok: false, message: `${path} → ${(e as Error).message}` };
  }
}

/** Checkout sessiyasının vəziyyəti (login, cari səhifə, cari məbləğ). */
export async function checkoutStatus() {
  return call<CheckoutStatus>("/checkout/status");
}

/**
 * GOOGLE PAY PƏNCƏRƏSİNİ TƏSDİQLƏYİR — ayrıca addım.
 *
 * "AUTORIZAR PAGO" ödənişi bitirmir: Zara ödənişi Google Pay-ə ötürür və AYRI
 * PƏNCƏRƏ açılır, yekun düymə oradadır. Pəncərə gec açıldığı üçün onu eyni
 * sorğunun içində gözləmək 100 saniyəlik hədddən çıxırdı — ona görə ayrı
 * sorğudur.
 *
 * `click: true` **PUL HƏRƏKƏT ETDİRİR**. Kart/parol tələb olunarsa scraper
 * heç nə yazmır və `card_input_required` / `password_required` qaytarır.
 */
export async function completeGooglePay(click = false) {
  return call<{
    ok: boolean;
    clicked?: string | false;
    confirmed?: boolean;
    orderId?: string | null;
    orderNumber?: string | null;
    urlAfter?: string | null;
    reason?: string;
    buttons?: string[];
    text?: string;
  }>("/checkout/gpay", {
    method: "POST",
    body: JSON.stringify({ click }),
  });
}

/**
 * SESSİYANI GOOGLE SSO İLƏ BƏRPA EDİR.
 *
 * Zara sessiyası vaxtaşırı düşür (ölçüldü: Zara-nın öz cavabı `kind: "guest"`
 * olur) və bütün avto-alış dayanırdı. Serverdəki brauzerdə Google hesabı açıq
 * olduğu üçün "Continuar con Google" seçimi sessiyanı parolsuz qaytarır.
 *
 * PAROL və TƏSDİQ KODU YAZILMIR — Google onları istəyərsə cavab
 * `password_required` / `code_required` olur və insan girişi tələb edilir.
 */
export async function loginWithGoogle(email?: string) {
  return call<{
    ok: boolean;
    loggedIn?: boolean;
    reason?: string;
    error?: string | null;
    url?: string;
    user?: { name: string | null; email: string | null; kind: string } | null;
  }>("/checkout/login/google", {
    method: "POST",
    body: JSON.stringify({ click: true, email: email ?? null }),
  });
}

/**
 * Billing formasının STRUKTURU — ad yoxlaması üçün oxunur.
 *
 * Scraper sahələrin DƏYƏRİNİ qaytarmır (şəxsi məlumat qəsdən gizlədilir),
 * yalnız `filled` bayrağını verir. Tip məhz cavaba uyğun yazılıb — əvvəl
 * burada `value` gözlənilirdi və müqayisə həmişə uğursuz olurdu.
 */
export async function readAddressForm() {
  return call<{
    url: string;
    fields: {
      name: string | null;
      type?: string | null;
      label?: string | null;
      filled?: boolean;
    }[];
  }>("/checkout/address-form");
}

/**
 * Billing formasında hər sifarişdə dəyişən ÜÇ sahə:
 *   · Name    (`firstName`)
 *   · Surname (`lastName`)
 *   · Flat number and/or letter (`addressLines[1]`) → MÜŞTƏRİ KODU (FOR000001)
 *
 * Qalan hər şeyə — küçə, poçt indeksi, şəhər, əyalət, ölkə, telefon —
 * TOXUNULMUR: onlar bizim İspaniya anbarımızın sabit ünvanıdır və Zara
 * hesabında bir dəfə qurulub.
 *
 * Sahə adları canlı formadan təsdiqlənib (`GET /checkout/address-form`):
 * `addressLines[1]`-in etiketi məhz "Flat number and/or letter".
 *
 * `submit` default `false`: doldurur, göndərmir. Job əvvəlcə doldurub
 * yoxlayır, yalnız sonra göndərir.
 */
export async function fillCustomerName(
  firstName: string,
  lastName: string,
  /** Müştəri kodu — flat sahəsinə yazılır. */
  customerCode: string,
  opts?: { submit?: boolean; goTo?: "billing" | "shipping" },
) {
  return call<{
    filled: number;
    applied: { name: string }[];
    missing: string[];
    submitted: boolean;
    orderTotal?: string;
  }>("/checkout/fill-address", {
    method: "POST",
    body: JSON.stringify({
      goTo: opts?.goTo ?? "billing",
      submit: Boolean(opts?.submit),
      fields: {
        firstName,
        lastName,
        // Anbarın paketi tanıması üçün — ünvan blokunun içində çap olunur.
        "addressLines[1]": customerCode,
      },
    }),
  });
}

/* ------------------------------------------------------------------ *
 * SƏBƏT VƏ ÖDƏNİŞ                                                      *
 * ------------------------------------------------------------------ */

/** Səbət sətri — sahə adları CANLI cavabdan təsdiqlənib. */
export type CartRowRemote = {
  name?: string;
  size?: string;
  color?: string;
  quantity?: number;
  priceEur?: number;
  colorProductId?: string;
  url?: string;
};

/**
 * Səbəti boşaldır və BOŞ olduğunu təsdiqləyir.
 *
 * `verifiedEmpty` scraper-in özündə yoxlanılır (silir, sonra yenidən oxuyur).
 * `false` olarsa job DAYANMALIDIR: səbətdə nə qaldığını bilmədən davam etmək
 * bir müştəriyə başqasının malını almaq deməkdir.
 */
export async function clearCart() {
  return call<{
    ok: boolean;
    removed?: number;
    remaining?: number;
    verifiedEmpty: boolean;
    error?: string | null;
  }>(
    "/checkout/cart/clear",
    { method: "POST", body: JSON.stringify({}) },
  );
}

/**
 * Səbətin cari məzmunu.
 *
 * DİQQƏT — massivin adı `rows`-dur, `lines` DEYİL. Əvvəl burada `lines`
 * yazılmışdı və sahə heç vaxt mövcud olmadığı üçün "səbət boşdur" yoxlaması
 * HƏMİŞƏ keçirdi. Yəni dolu səbətlə davam etmək riski real idi.
 * Boşluq üçün `isEmpty`/`lineCount` istifadə olunur — scraper özü hesablayır.
 */
export async function readCart() {
  return call<{
    url?: string;
    rows: CartRowRemote[];
    lineCount: number;
    headerCount?: number;
    isEmpty: boolean;
    orderTotal?: string | null;
  }>("/checkout/cart");
}

/**
 * Məhsulu seçilmiş RƏNG və ÖLÇÜ ilə səbətə atır.
 *
 * Zara-da rəng ayrıca seçici deyil — məhsul URL-inin içindədir. `colorName`
 * verilsə scraper səhifədəki rənglə YOXLAYIR və uyğun gəlməsə heç nə əlavə
 * etmir (`color_mismatch`). Yəni səhv rəng almaq mümkün deyil.
 */
export async function addToCart(req: {
  productUrl: string;
  sizeName: string;
  colorName?: string | null;
  quantity?: number;
}) {
  return call<{
    ok: boolean;
    reason?: string;
    error?: string;
    line?: CartRowRemote;
  }>(
    "/checkout/cart/add",
    {
      method: "POST",
      body: JSON.stringify({
        productUrl: req.productUrl,
        sizeName: req.sizeName,
        colorName: req.colorName ?? null,
        quantity: req.quantity ?? 1,
      }),
    },
  );
}

/**
 * Ödəniş.
 *
 * `confirm: false` (default) — ödəniş səhifəsini HAZIRLAYIR, düyməyə BASMIR.
 * `confirm: true` — real ödəniş. Job bunu yalnız `--pay` bayrağı ilə göndərir.
 */
export async function payOrder(opts?: {
  confirm?: boolean;
  /** Ödəniş üsulu — Zara səhifəsindəki `data-qa-action` açarı. */
  method?: string;
}) {
  return call<{
    ok: boolean;
    executed?: boolean;
    confirmed?: boolean;
    reachedPayment?: boolean;
    /** Hansı üsul seçildi (və ya niyə seçilmədi). */
    paymentMethod?: {
      ok: boolean;
      clicked?: string;
      reason?: string;
      available?: string[];
    } | null;
    url?: string;
    urlAfter?: string;
    orderId?: string;
    orderNumber?: string;
    note?: string | null;
    gpay?: { opened: boolean; clicked: string | null; buttons: string[]; blocked: string | null };
    reason?: string;
    availableButtons?: string[];
  }>("/checkout/pay", {
    method: "POST",
    body: JSON.stringify({
      confirm: Boolean(opts?.confirm),
      // GOOGLE PAY — açıq seçilir. Səhifədəki default üsul kart ola bilər;
      // seçim etməsək yanlış vasitə ilə ödəniş riski qalır.
      method: opts?.method ?? "googlepay",
    }),
  });
}
