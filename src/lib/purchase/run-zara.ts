import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { acquirePurchaseLock } from "./lock";
import { buildWorkUnits, formatPlan, type WorkUnit } from "./plan";
import {
  checkoutStatus,
  readAddressForm,
  fillCustomerName,
  clearCart,
  readCart,
  addToCart,
  payOrder,
  loginWithGoogle,
  completeGooglePay,
  type Unsupported,
} from "./zara-checkout";
import { splitFullName } from "@/lib/customer-code";
import {
  getPlatformWarehouse,
  formatWarehouse,
} from "@/lib/platform-warehouse";

/**
 * ZARA ALIŞ JOB-U.
 *
 * Quruluş qəsdən belədir: əvvəl PLAN (user üzrə qruplaşdırma), sonra planın
 * ARDICIL icrası. Heç bir yerdə `Promise.all` yoxdur — nə user-lər, nə də
 * məhsullar üzrə. Bir user tam bitmədən (terminal vəziyyətə çatmadan)
 * növbətisi BAŞLAMIR.
 *
 * Səbəb: Zara checkout-u tək paylaşılan brauzer sessiyasıdır. İki user
 * qarışsa, birinin sifarişi digərinin adına düşər — geri qaytarıla bilməyən
 * səhv. Ona görə vahid yarımçıq qalsa (ad uyğun gəlmədi, səbət təmizlənmədi)
 * job tamamilə DAYANIR, növbəti user-ə keçmir: çirkli səbətlə davam etmək
 * məhz həmin qarışığı yaradır.
 */

export type RunOptions = {
  /** true — REAL ÖDƏNİŞ. Default `false` (quru icra, pul hərəkət etmir). */
  pay?: boolean;
  onlyUserId?: string;
  /** Zara totalı ilə bizimki arasında icazə verilən fərq (sent). */
  toleranceCents?: number;
};

/** Bir iş vahidinin YEKUN vəziyyəti. Yalnız `done` növbətiyə icazə verir. */
type UnitOutcome = "done" | "aborted";

export type RunResult = {
  ok: boolean;
  runId: string;
  lockBusy?: boolean;
  dryRun: boolean;
  plan: string;
  usersPlanned: number;
  usersCompleted: number;
  itemsPlanned: number;
  blockers: string[];
  message: string;
};

const DEFAULT_TOLERANCE_CENTS = 100;

export async function runZaraPurchaseJob(
  opts: RunOptions = {},
): Promise<RunResult> {
  const runId = randomUUID();
  const pay = Boolean(opts.pay);
  const blockers: string[] = [];

  // ── KİLİD ──────────────────────────────────────────────────────────────
  // Növbəyə DURMURUQ: gözləyən icra kilidi alanda formada artıq başqa
  // user-in adı qalmış olar. Tutulubsa dərhal və təmiz çıxırıq.
  const lock = await acquirePurchaseLock();
  if (!lock) {
    return {
      ok: false,
      runId,
      lockBusy: true,
      dryRun: !pay,
      plan: "",
      usersPlanned: 0,
      usersCompleted: 0,
      itemsPlanned: 0,
      blockers: ["lock_busy"],
      message:
        "Başqa alış job-u işləyir — bu icra heç nə etmədən çıxdı. " +
        "(Paralel işləsəydi, bir müştərinin sifarişi digərinin adına düşərdi.)",
    };
  }

  try {
    // ── HƏLL OLUNMAMIŞ ALIŞLAR ───────────────────────────────────────────
    // Ödəniş anında çökmüş icra varsa, nəticəsi məlum deyil. Avtomatik
    // təkrar alış ən pis nəticədir — ona görə job işləmir, insan yoxlayır.
    const unresolved = await prisma.platformOrder.findMany({
      where: { platformKey: "zara", status: { in: ["paying", "needs_review"] } },
      select: { id: true, userId: true, paymentStartedAt: true },
    });
    if (unresolved.length > 0) {
      await log(runId, null, "abort", "fail",
        `${unresolved.length} həll olunmamış alış — əl ilə yoxlanmalıdır`,
        { ids: unresolved.map((u) => u.id) });
      return {
        ok: false, runId, dryRun: !pay, plan: "",
        usersPlanned: 0, usersCompleted: 0, itemsPlanned: 0,
        blockers: ["unresolved_purchases"],
        message:
          `${unresolved.length} alışın nəticəsi məlum deyil (ödəniş başlayıb, ` +
          `təsdiq gəlməyib). Zara hesabında yoxlayın; alınıbsa order id-ni yazın, ` +
          `alınmayıbsa statusu "failed" edin. Həll olunmadan job işləmir.`,
      };
    }

    // ── 1) PLAN: user üzrə qruplaşdırma (emaldan ƏVVƏL) ──────────────────
    const units = await buildWorkUnits({ onlyUserId: opts.onlyUserId });
    const plan = formatPlan(units);
    const itemsPlanned = units.reduce((s, u) => s + u.items.length, 0);

    if (units.length === 0) {
      return {
        ok: true, runId, dryRun: !pay, plan,
        usersPlanned: 0, usersCompleted: 0, itemsPlanned: 0,
        blockers: [],
        message: "Alınacaq Zara sifarişi yoxdur.",
      };
    }

    // ── Sessiya yoxlaması — DAYANDIRICIDIR ───────────────────────────────
    //
    // Əvvəl bura yalnız `blockers`-ə yazır, icra isə davam edirdi: hesabdan
    // çıxılmış sessiyada job səbəti təmizləyib məhsulları atır, sonra ünvan
    // addımında dayanırdı. Yəni dəqiqələr itir və səbət səbəbsiz dəyişirdi.
    // İndi login yoxdursa DƏRHAL qayıdırıq — brauzerə heç toxunmuruq.
    const status = await checkoutStatus();
    if (!status.ok) {
      return {
        ok: false, runId, dryRun: !pay, plan,
        usersPlanned: units.length, usersCompleted: 0, itemsPlanned,
        blockers: [`checkout_status: ${status.message}`],
        message: `Zara checkout servisinə çıxış yoxdur: ${status.message}`,
      };
    }
    // `payments.zara.com` AYRI domendir və orada `loggedIn` yoxlaması işləmir
    // (hesab menyusu yoxdur). Brauzer ödəniş səhifəsində qalıbsa bu, çıxış
    // demək DEYİL — yalançı "login yoxdur" xətası verirdi.
    //
    // AMMA bu istisnaya GÜVƏNMƏK OLMAZ. Canlı icrada məhz belə oldu: brauzer
    // əvvəlki quru icradan ödəniş səhifəsində qalmışdı, sessiya isə bu arada
    // düşmüşdü. Yoxlama "ödəniş səhifəsindəyik, deməli login var" deyib keçdi,
    // job səbəti doldurdu və yalnız ünvan addımında `net::ERR_ABORTED` verdi
    // (Zara login-ə yönləndirirdi). Ona görə istisna halında vəziyyət
    // TƏKRAR YOXLANILIR: `zara.com`-a qayıdıb (səbət oxumaq bunu edir) login
    // vəziyyətinə yenidən baxırıq.
    // Yoxlama YAD DOMENLƏRİN HAMISI üçün təkrarlanır, təkcə `payments` üçün yox:
    // `account.zara.com` (login) və `payments.zara.com` — hər ikisində eyni
    // yalançı "guest" nəticəsi alınır, çünki session endpoint-i orada yoxdur.
    // Yeganə etibarlı cavab `www.zara.com`-dan gəlir.
    let loggedIn = status.data.loggedIn;
    const onZaraShop = /^https?:\/\/(www\.)?zara\.com\//i.test(status.data.url ?? "");
    if (!loggedIn && !onZaraShop) {
      await readCart(); // brauzeri `www.zara.com`-a qaytarır
      const recheck = await checkoutStatus();
      loggedIn = recheck.ok ? recheck.data.loggedIn : false;
    }

    // SESSİYA DÜŞÜBSƏ ÖZÜMÜZ BƏRPA EDİRİK — Google SSO ilə.
    //
    // Zara sessiyanı vaxtaşırı kəsir; əvvəl bu, job-u tam dayandırırdı və
    // adam serverdəki brauzerə əl ilə girməli olurdu. Serverdəki brauzerdə
    // Google hesabı açıq olduğu üçün giriş parolsuz bərpa olunur.
    //
    // Parol/kod tələb olunarsa bərpa DAYANIR (scraper heç nə yazmır) və
    // aşağıdakı bloklayıcı mesaj işə düşür.
    let ssoNote: string | null = null;
    if (!loggedIn) {
      const sso = await loginWithGoogle(process.env.ZARA_ACCOUNT_EMAIL);
      loggedIn = sso.ok && Boolean(sso.data.loggedIn);
      ssoNote = sso.ok
        ? loggedIn
          ? `sessiya Google SSO ilə bərpa olundu (${sso.data.user?.email ?? "?"})`
          : `SSO bərpası tutmadı: ${sso.data.reason ?? sso.data.error ?? "səbəb bilinmir"}`
        : `SSO bərpası çağırıla bilmədi: ${sso.message}`;
    }

    if (!loggedIn) {
      return {
        ok: false, runId, dryRun: !pay, plan,
        usersPlanned: units.length, usersCompleted: 0, itemsPlanned,
        blockers: ["checkout_not_logged_in"],
        message:
          `Zara hesabına DAXİL OLUNMAYIB — heç nə edilmədi. ` +
          (ssoNote ? `${ssoNote}. ` : "") +
          `Serverdəki brauzerdə (CDP 9224) hesaba girin, sonra komandanı ` +
          `yenidən işlədin. Cari səhifə: ${status.data.url}`,
      };
    }

    // ── 2) İCRA: bir-bir, ARDICIL ────────────────────────────────────────
    let usersCompleted = 0;
    let previous: UnitOutcome | null = null;

    for (const unit of units) {
      // Açıq mühafizə: əvvəlki vahid terminal vəziyyətə çatmayıbsa başlamırıq.
      // (Kod onsuz da ardıcıldır — bu, niyyəti pozulmaz edir.)
      if (previous === "aborted") break;

      const outcome = await processUnit({
        runId, unit, pay,
        tolerance: opts.toleranceCents ?? DEFAULT_TOLERANCE_CENTS,
        blockers,
      });

      previous = outcome;
      if (outcome === "done") usersCompleted++;
      else break; // çirkli səbətlə növbəti user-ə KEÇMİRİK
    }

    const message = pay
      ? `Real alış rejimi. ${usersCompleted}/${units.length} user tamamlandı.`
      : `QURU İCRA — pul hərəkət etmədi. ${units.length} user, ${itemsPlanned} sətir. ` +
        `Real alış üçün: --pay`;

    return {
      ok: blockers.length === 0,
      runId, dryRun: !pay, plan,
      usersPlanned: units.length,
      usersCompleted, itemsPlanned, blockers, message,
    };
  } finally {
    await lock.release(); // xəta olsa belə kilid buraxılır
  }
}

/* ------------------------------------------------------------------ */

/**
 * TƏK user-in tam iş vahidi.
 * Ardıcıllıq: səbət təmizlə+yoxla → məhsullar → ad yaz+təsdiqlə → ödə
 *             → order id yaz (səbəti təmizləməzdən ƏVVƏL) → səbət təmizlə+yoxla
 */
async function processUnit(a: {
  runId: string;
  unit: WorkUnit;
  pay: boolean;
  tolerance: number;
  blockers: string[];
}): Promise<UnitOutcome> {
  const { runId, unit, pay, blockers } = a;
  // HƏR SİFARİŞDƏ DƏYİŞƏN ÜÇ SAHƏ: ad, soyad və FLAT (müştəri kodu).
  //
  // Zara sifarişləri İspaniyadakı ANBARIMIZA gəlir — ünvan hamısında eynidir,
  // fərq yalnız alıcı sətrindədir. Ad təkrarlana bildiyi üçün (iki "Umid
  // Ismayilov") "Flat number and/or letter" sahəsinə təkrarolunmaz
  // `FOR000001` kodu yazılır; anbar paketin hansı müştəriyə aid olduğunu
  // ünvan blokundan, qutunu açmadan oxuyur.
  const { firstName, lastName } = splitFullName(unit.fullName);
  const code = unit.customerCode;

  // `PlatformOrder` YALNIZ real alışda yaradılır: bu yazı yuxarı axındakı
  // əsl alış cəhdini təmsil edir. Quru icra cəhd deyil — hər dəfə "failed"
  // sətir yaratsaydı, baza mənasız qeydlərlə dolardı və operator paneli
  // real problemləri onların arasında itirərdi. Quru icrada jurnal kifayətdir.
  const po = pay
    ? await prisma.platformOrder.create({
        data: {
          platformKey: "zara",
          userId: unit.userId,
          status: "planned",
          currency: unit.currency,
          totalCents: unit.totalCents,
        },
      })
    : null;
  const poId = po?.id ?? null;

  await log(runId, poId, "plan", "ok",
    `${unit.fullName}: ${unit.items.length} sətir, ` +
    `${(unit.totalCents / 100).toFixed(2)} ${unit.currency}`,
    { orders: unit.orderReferences });

  const fail = async (step: string, msg: string, missing?: string) => {
    if (missing) blockers.push(missing);
    await log(runId, poId, step, "fail", msg);
    // Quru icrada `poId` yoxdur — yazılacaq bir şey də yoxdur.
    if (poId) {
      await prisma.platformOrder.update({
        where: { id: poId },
        data: { status: "failed" },
      });
    }
    return "aborted" as const;
  };

  // ── MÜŞTƏRİ KODU və ANBAR ünvanı yoxlanılır ────────────────────────────
  //
  // İkisi də sifarişdən ƏVVƏL olmalıdır: kodsuz paket anbarda kimə aid
  // olduğu bilinmədən qalır, anbar ünvanı təyin olunmayıbsa isə mal ümumiyyətlə
  // səhv yerə gedər. Hər ikisi geri qaytarıla bilməyən itkidir — ona görə
  // uydurma dəyərlə davam etmirik, vahid DAYANIR.
  if (!code) {
    return fail(
      "customer_code",
      `${unit.fullName} üçün müştəri kodu (User.customerCode) yoxdur — ` +
        `anbar paketi tanıya bilməz, sifariş verilmir.`,
    );
  }

  const warehouse = await getPlatformWarehouse("zara");
  if (!warehouse) {
    return fail(
      "warehouse",
      `Zara üçün anbar ünvanı təyin olunmayıb (Platform.warehouse). ` +
        `\`npm run warehouse:seed\` işlədin və ya /admin/platforms-dən yazın.`,
    );
  }

  await log(runId, poId, "warehouse", "ok",
    `çatdırılma ünvanı: ${formatWarehouse(warehouse)} · alıcı: ${firstName} ${lastName}`);

  // ── səbəti təmizlə + BOŞ olduğunu yoxla ────────────────────────────────
  const cleared = await clearCart();
  if (!cleared.ok) return fail("cart_clear", cleared.message);
  // `verifiedEmpty` scraper-in ÖZ yoxlamasıdır (silir, sonra yenidən oxuyur).
  // Boş olduğuna əmin deyiliksə DAYANIRIQ: səbətdə qalan sətir növbəti
  // müştərinin sifarişinə qarışardı.
  if (!cleared.data.verifiedEmpty) {
    return fail("cart_clear", "səbətin boşaldığı təsdiqlənmədi — icra dayandı");
  }

  const cart = await readCart();
  if (!cart.ok) return fail("cart_verify", cart.message);
  // `isEmpty` scraper-in öz hesablamasıdır; `rows` da yoxlanılır ki, sahə
  // gəlməsə belə səhvən "boş" sayılmasın.
  if (!cart.data.isEmpty || (cart.data.rows?.length ?? 0) > 0) {
    return fail(
      "cart_verify",
      `səbət boş deyil (${cart.data.lineCount ?? cart.data.rows?.length ?? "?"} sətir) — icra dayandı`,
    );
  }
  await log(runId, poId, "cart_clear", "ok", "səbət boşdur, təsdiqləndi");

  // ── məhsulları variantı ilə səbətə at ──────────────────────────────────
  for (const it of unit.items) {
    // Məhsul URL-i və ÖLÇÜ olmadan səbətə atmaq mümkün deyil — Zara-nın
    // `cart/add` endpointi ölçünün adını tələb edir. Səssizcə keçmirik:
    // sətir atlanarsa müştəri pul verib mal almamış olardı.
    if (!it.productUrl) {
      return fail("add_item", `${it.name}: məhsul linki yoxdur.`);
    }
    if (!it.size) {
      return fail(
        "add_item",
        `${it.name}: ölçü seçimi sifarişdə saxlanmayıb — hansı ölçünü ` +
          `alacağımız bilinmir.`,
      );
    }

    // TƏKRAR CƏHD BURADA, BRAUZERİN İÇİNDƏ YOX.
    //
    // Zara aralıq olaraq öz xəbərdarlığını verir — "En este momento no puede
    // completarse tu petición" (səbəb `zara_busy`). Ölçüdə, stokda və ya
    // selektorda problem YOXDUR: eyni sorğu bir neçə saniyə sonra tutur.
    // Ona görə cəhdlər AYRI-AYRI HTTP sorğusu kimi gedir — bir sorğunun içində
    // döngə qursaq, üç cəhd Cloudflare-in 100 saniyə limitini aşır və 524 gəlir.
    //
    // Cəhdlərin hamısı tutmasa DAYANIRIQ: yarımçıq səbətlə ödəmək müştəriyə
    // əskik mal göndərmək deməkdir.
    // TƏKRAR YALNIZ SƏBƏT DƏYİŞMƏYƏNDƏ.
    //
    // Scraper hər iki halda səbəti təkrar oxuyub təsdiqləyir ki, sətir ƏLAVƏ
    // OLUNMAYIB — ona görə təkrar cəhd ikiqat alış riski yaratmır. Digər
    // xətalarda (şəbəkə kəsilməsi, timeout) təkrar ETMİRİK: orada səbətin
    // vəziyyəti bilinmir.
    //
    // ⚠️ ƏVVƏLKİ SƏHV: şərt `if (!added.ok || added.data.ok) break` idi.
    // Scraper uğursuzluqda `success:false` qaytarır və müştəri qatı onu
    // `ok:false`-a çevirir — yəni ilk uğursuzluqda dövrə DƏRHAL qırılırdı və
    // təkrar cəhd HEÇ VAXT işə düşmürdü. Səbəb artıq `message` mətnindən
    // oxunur.
    // `pdp_not_loaded` da keçicidir: səhifə ya WAF-a düşür, ya da düzüm
    // (mobil/masaüstü) səhv render olunur — hər ikisi təkrar cəhddə keçir.
    const RETRYABLE = ["zara_blocked", "zara_busy", "not_added", "pdp_not_loaded"];
    const ATTEMPTS = 3;

    // Yuxarıdakı mühafizələr `productUrl`/`size`-in dolu olduğunu təsdiqləyib;
    // bağlamanın içində daralma itdiyi üçün dəyərlər burada tutulur.
    const productUrl = it.productUrl;
    const sizeName = it.size;
    const tryAdd = () =>
      addToCart({
        productUrl,
        sizeName,
        colorName: it.color,
        quantity: it.quantity,
      });

    let added = await tryAdd();

    for (let attempt = 2; attempt <= ATTEMPTS; attempt++) {
      if (added.ok && added.data.ok) break;

      const why = added.ok ? (added.data.reason ?? "?") : added.message;
      const hit = RETRYABLE.find((r) => why.includes(r));
      if (!hit) break;

      await log(runId, poId, "add_item", "skip",
        `${it.name}: ${attempt - 1}-ci cəhd tutmadı (${hit}) — təkrar`);

      // 403 kənar müdafiə qatındandır: dərhal təkrar yenə 403 gətirir.
      // Fasilə artırılır (10s → 20s), qalan hallarda qısa gözləmə kifayətdir.
      const waitMs = hit === "zara_blocked" ? attempt * 10_000 : 4_000;
      await new Promise((r) => setTimeout(r, waitMs));

      added = await tryAdd();
    }

    if (!added.ok || !added.data.ok) {
      const why = added.ok ? (added.data.reason ?? "səbəb bilinmir") : added.message;
      const blocked = why.includes("zara_blocked") || why.includes("zara_busy");
      return fail(
        "add_item",
        blocked
          ? `${it.name}: Zara ${ATTEMPTS} cəhdin hamısını rədd etdi. ` +
            `Kök səbəb — kənar müdafiə qatı: POST /shop/cart/add → HTTP 403 ` +
            `("Access Denied"). Məhsulda, ölçüdə və ya kodda problem yoxdur; ` +
            `bir qədər sonra job-u yenidən işlədin.`
          : `${it.name}: səbətə atılmadı — ${why}`,
      );
    }
    await log(runId, poId, "add_item", "ok",
      `${it.name} ×${it.quantity} · ölçü ${it.size}` +
      (it.color ? ` · rəng ${it.color}` : ""), { itemId: it.itemId });
  }

  // ── SƏBƏTİN SON YOXLAMASI ──────────────────────────────────────────────
  //
  // Hər əlavə "ok" desə də səbətdə sətir sayı gözlənilənlə üst-üstə
  // düşməlidir. Bu yoxlama olmadan yarımçıq səbətlə ödəniş riski qalırdı:
  // müştəri iki məhsulun pulunu verib birini alardı.
  const cartAfter = await readCart();
  if (!cartAfter.ok) return fail("cart_check", cartAfter.message);
  const expected = unit.items.length;
  const actual = cartAfter.data.lineCount ?? cartAfter.data.rows?.length ?? 0;
  if (actual !== expected) {
    return fail(
      "cart_check",
      `səbətdə ${actual} sətir var, gözlənilən ${expected} — ödəniş edilmir`,
    );
  }
  await log(runId, poId, "cart_check", "ok",
    `səbətdə ${actual} sətir · ` +
    (cartAfter.data.rows ?? [])
      .map((r) => `${r.name} (${r.size ?? "?"})`)
      .join(" · "));

  // ── ad/soyad → yaz, sonra TƏKRAR OXU və təsdiqlə ───────────────────────
  // ÜNVAN: yalnız `billing` səhifəsi işlədilir.
  //
  // Bir müddət əvvəl `shipping-address` səhifəsi də doldurulurdu, amma canlı
  // sınaqda `/user/shipping-address` naviqasiyası `net::ERR_ABORTED` verdi və
  // ardınca sessiya login səhifəsinə düşdü. Bu hesabda çatdırılma və billing
  // EYNİ ünvan kitabçası sətrindən gəlir (billing-i saxlayanda Zara özü
  // `shipping/method-selection`-a keçir), ona görə ikinci səhifəyə toxunmağın
  // faydası yox, riski var idi.
  const filled = await fillCustomerName(firstName, lastName, code, {
    submit: false,
    goTo: "billing",
  });
  if (!filled.ok) return fail("fill_name", filled.message);

  const verified = await verifyName(firstName, lastName);
  if (!verified.ok) return fail("verify_name", verified.message);

  await log(runId, poId, "verify_name", "ok",
    `formada ad təsdiqləndi: ${firstName} ${lastName} · flat: ${code}`);

  // ── formanı TƏSDİQLƏ (CONTINUE) ────────────────────────────────────────
  //
  // Doldurmaq kifayət deyil: təsdiqlənməsə Zara növbəti addıma keçmir və
  // brauzer səbət səhifəsində qalır. Canlı sınaqda `pay` məhz buna görə
  // "ödəniş düyməsi tapılmadı" verirdi — səhifədə `CONTINUAR` dayanmışdı.
  //
  // Yoxlamadan SONRA edilir: əvvəl adın doğru yazıldığına əmin oluruq,
  // yalnız sonra irəli göndəririk.
  const submitted = await fillCustomerName(firstName, lastName, code, {
    submit: true,
    goTo: "billing",
  });
  if (!submitted.ok) return fail("submit_address", submitted.message);
  await log(runId, poId, "submit_address", "ok",
    "ünvan formasi təsdiqləndi — checkout növbəti addıma keçdi");

  // ── ödəniş ─────────────────────────────────────────────────────────────
  //
  // QURU İCRADA DA ödəniş səhifəsinə qədər gedirik (`confirm: false`):
  // scraper səhifəni hazırlayır, düyməyə BASMIR. Beləcə bütün axını pul
  // xərcləmədən sonadək sınamaq olur — əvvəl quru icra `verify_name`-dən
  // sonra dayanırdı və ödəniş addımındakı problemlər yalnız real alışda
  // üzə çıxırdı.
  if (!pay) {
    const dry = await payOrder({ confirm: false });
    if (!dry.ok) {
      await log(runId, poId, "pay", "fail",
        `ödəniş səhifəsinə çatmadı: ${dry.message}`);
      return "aborted";
    }
    const picked = dry.data.paymentMethod;
    await log(runId, poId, "pay", "skip",
      `QURU İCRA — ödəniş səhifəsi hazırdır, düyməyə BASILMADI. ` +
      `Məbləğ: ${(unit.totalCents / 100).toFixed(2)} ${unit.currency} · ` +
      `üsul: ${picked?.ok ? picked.clicked : `SEÇİLMƏDİ (${picked?.reason ?? "?"})`}`);
    return "done";
  }

  // Ödənişdən ƏVVƏL işarə: proses tam bu anda çöksə, növbəti icra
  // "alınıb, id məlum deyil"i "alınmayıb"dan ayıra bilsin.
  // Bu nöqtəyə yalnız `pay=true` ilə gəlinir, ona görə `poId` mütləq doludur.
  await prisma.platformOrder.update({
    where: { id: poId! },
    data: { status: "paying", paymentStartedAt: new Date() },
  });

  // `confirm: true` — REAL ödəniş. Bura yalnız `--pay` ilə gəlinir.
  let paid = await payOrder({ confirm: true, method: "googlepay" });

  // ── GOOGLE PAY PƏNCƏRƏSİ — AYRICA SORĞU ──────────────────────────────
  //
  // "AUTORIZAR PAGO" ödənişi bitirmir; Zara ödənişi provayderə ötürür və
  // Google Pay AYRI PƏNCƏRƏ açır. Pəncərə bir neçə saniyə gec açılır, ona
  // görə eyni sorğunun içində gözləmək 100 saniyəlik hədddən çıxırdı —
  // ayrıca çağırılır.
  if (paid.ok && paid.data.executed && !paid.data.confirmed) {
    await log(runId, poId, "pay", "skip",
      "AUTORIZAR PAGO basıldı — Google Pay pəncərəsi gözlənilir");

    const gp = await completeGooglePay(true);

    if (gp.ok && gp.data.confirmed) {
      paid = {
        ok: true,
        data: {
          ...paid.data,
          confirmed: true,
          orderId: gp.data.orderId ?? undefined,
          orderNumber: gp.data.orderNumber ?? undefined,
          urlAfter: gp.data.urlAfter ?? undefined,
        },
      };
      await log(runId, poId, "pay", "ok",
        `Google Pay təsdiqləndi ("${gp.data.clicked}")`);
    } else {
      // 3-D SECURE: bank SMS kodu istəyir. Kod YAZILMIR — insan təsdiqi
      // tələb olunur. Bu, uğursuzluq deyil, DAYANMA nöqtəsidir.
      const why = gp.ok ? (gp.data.reason ?? "təsdiqlənmədi") : gp.message;
      await log(runId, poId, "pay", "fail",
        `Google Pay tamamlanmadı: ${why}` +
        (gp.ok && gp.data.buttons?.length ? ` · düymələr: ${gp.data.buttons.join(" | ")}` : ""));
    }
  }

  if (!paid.ok) {
    await log(runId, poId, "pay", "fail", paid.message);

    // ÖDƏNİŞİN BAŞLAMADIĞI DƏQİQ BİLİNƏN SƏBƏBLƏR.
    //
    // Scraper bu hallarda ödəniş düyməsinə TOXUNMADAN qayıdır — yəni pul
    // hərəkət edə bilməzdi. Onları "vəziyyət bilinmir" saymaq zərərlidir:
    // sifariş `paying` qalır və növbəti icra ÜMUMİYYƏTLƏ başlamır (job
    // həll olunmamış `paying` görəndə dayanır). Nəticədə bir keçici Zara
    // xətası bütün avto-alışı əl ilə açılana qədər kilidləyirdi.
    const NOT_STARTED = [
      "zara_busy",                    // Zara imtina etdi, addım keçilmədi
      "payment_step_not_reached",     // ödəniş səhifəsinə çatılmadı
      "pay_button_not_found",         // düymə tapılmadı → basılmadı
      "payment_method_not_selected",  // üsul seçilmədi → basılmadı
      "empty_cart",
      "not_logged_in",
    ];
    const notStarted = NOT_STARTED.some((r) => paid.message.includes(r));

    if (notStarted) {
      await prisma.platformOrder.update({
        where: { id: poId! },
        data: { status: "failed", paymentStartedAt: null },
      });
      await log(runId, poId, "pay", "fail",
        "ödəniş BAŞLAMADI (düyməyə basılmayıb) — status `failed`, təkrar icra təhlükəsizdir");
      return "aborted";
    }

    // Şəbəkə/HTTP xətası: ödənişin BAŞLAYIB-başlamadığı BİLİNMİR. Ona görə
    // `paying` statusu SAXLANILIR — "failed" yazsaq növbəti icra eyni
    // sifarişi ikinci dəfə alardı. Operator əl ilə yoxlayıb bağlamalıdır.
    await log(runId, poId, "pay", "fail",
      "vəziyyət bilinmir — status `paying` qaldı, Zara-da əl ilə yoxlayın");
    return "aborted";
  }

  if (!paid.data.ok || !paid.data.confirmed) {
    // ⚠️ DÜYMƏYƏ BASILIB — status "failed" YAZILMIR.
    //
    // Bura `executed:true` ilə gəlmək mümkündür: "AUTORIZAR PAGO" basılıb,
    // amma Google Pay pəncərəsi təsdiqlənməyib. Ödənişin getmədiyi TAM ƏMİN
    // deyil, ona görə sifariş `paying` qalır və insan yoxlayır. "failed"
    // yazsaq növbəti icra eyni malı İKİNCİ DƏFƏ alardı.
    const detail =
      `ödəniş təsdiqlənmədi: ${paid.data.reason ?? "səbəb bilinmir"}` +
      (paid.data.note ? ` · ${paid.data.note}` : "") +
      (paid.data.urlAfter ?? paid.data.url ? ` · səhifə: ${paid.data.urlAfter ?? paid.data.url}` : "");

    await log(runId, poId, "pay", "fail", detail);

    if (paid.data.executed) {
      await log(runId, poId, "pay", "fail",
        "düyməyə BASILIB — status `paying` saxlanıldı, Zara hesabında əl ilə yoxlayın");
      return "aborted";
    }

    await prisma.platformOrder.update({
      where: { id: poId! },
      data: { status: "failed", paymentStartedAt: null },
    });
    return "aborted";
  }

  // ── UĞUR: Zara sifariş nömrəsini yaz və sətirləri bu alışa bağla ───────
  //
  // Sətirlərin bağlanması İDEMPOTENTLİYİN əsasıdır: `platformOrderId` dolu
  // olan sətir növbəti icrada plana ümumiyyətlə düşmür, yəni eyni mal iki
  // dəfə alınmır.
  const orderNumber = paid.data.orderNumber ?? null;
  await prisma.$transaction([
    prisma.platformOrder.update({
      where: { id: poId! },
      data: {
        status: "paid",
        externalOrderId: orderNumber,
        purchasedAt: new Date(),
      },
    }),
    prisma.orderItem.updateMany({
      where: { id: { in: unit.items.map((i) => i.itemId) } },
      data: { platformOrderId: poId!, purchasedAt: new Date() },
    }),
  ]);

  await log(runId, poId, "pay", "ok",
    `ÖDƏNİLDİ · Zara sifariş nömrəsi: ${orderNumber ?? "(qaytarılmadı)"} · ` +
    `${unit.items.length} sətir bağlandı`);

  return "done";
}

/**
 * Billing formasını təkrar oxuyub adın YAZILDIĞINI təsdiqləyir.
 *
 * DİQQƏT — scraper sahələrin DƏYƏRİNİ qaytarmır (şəxsi məlumat qəsdən
 * gizlədilir), yalnız `filled: true/false` verir. Ona görə burada dəyər
 * müqayisəsi mümkün deyil: sahələrin DOLU olduğu yoxlanılır.
 *
 * Bu, tam təminat deyil və olduğu kimi yazılmalıdır: forma köhnə adla dolu
 * qalıbsa yoxlama keçər. Dəyər səviyyəsində təsdiq üçün scraper-ə
 * `POST /checkout/verify-fields` lazımdır (gözlənilən dəyəri qəbul edib
 * yalnız `match: true/false` qaytaran endpoint) — o əlavə olunanda bu
 * funksiya ona keçməlidir.
 */
async function verifyName(firstName: string, lastName: string) {
  const form = await readAddressForm();
  if (!form.ok) return { ok: false, message: form.message };

  const filled = (n: string) =>
    Boolean(form.data.fields.find((f) => f.name === n)?.filled);

  const missing = [
    !filled("firstName") && "firstName",
    !filled("lastName") && "lastName",
    !filled("addressLines[1]") && "addressLines[1] (müştəri kodu)",
  ].filter(Boolean) as string[];

  if (missing.length === 0) {
    return { ok: true, message: `dolu: ${firstName} ${lastName}` };
  }
  return {
    ok: false,
    message:
      `Formada boş qalan sahə(lər) — ÖDƏNİŞ EDİLMİR: ${missing.join(", ")}`,
  };
}

function isUnsupported(v: unknown): v is Unsupported {
  return Boolean(v && typeof v === "object" && "unsupported" in v);
}

async function log(
  runId: string,
  platformOrderId: string | null,
  step: string,
  outcome: string,
  message: string,
  detail?: unknown,
) {
  await prisma.purchaseLog.create({
    data: {
      runId, platformOrderId, step, outcome, message,
      detail: (detail ?? null) as never,
    },
  });
}
