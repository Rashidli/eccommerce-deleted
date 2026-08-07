/**
 * MÜŞTƏRİ KODU — İspaniyadakı anbarımızın paketi tanıması üçün.
 *
 * NİYƏ LAZIMDIR: Zara sifarişləri bizim İspaniya anbarımıza gəlir. Anbara
 * gündə onlarla paket düşür və hamısının çatdırılma ünvanı EYNİDİR — fərq
 * yalnız qutunun üstündəki addadır. Ad isə təkrarlana bilər (iki "Umid
 * Ismayilov"), ona görə adın ƏVVƏLİNƏ təkrarolunmaz kod yazılır:
 *
 *     FOR000001 Umid   |   Ismayilov
 *     ^^^^^^^^^        ad             soyad
 *
 * Anbar kodu görən kimi paketin bizim müştəriyə aid olduğunu və hansı
 * müştəri olduğunu bilir.
 *
 * Kod `User.customerNo` sayğacından qurulur (baza özü artırır) — `User.id`
 * cuid olduğu üçün insana və qutu etiketinə yaramır.
 *
 * Bu fayl `server-only` DEYİL: kod müştəriyə öz panelində də göstərilir.
 */

/** Kodun sabit ön şəkilçisi. */
export const CUSTOMER_CODE_PREFIX = "FOR";

/**
 * Rəqəm hissəsinin uzunluğu.
 *
 * 6 rəqəm = 999 999 müştəriyə çatır. Uzunluq SABİTDİR: dəyişsə, artıq
 * çap olunmuş etiketlərlə bazadakı kod uyğun gəlməz.
 */
const DIGITS = 6;

/**
 * `1` → `"FOR000001"`.
 *
 * DİQQƏT: kodun ƏSL mənbəyi bazadakı `User.customerCode` sütunudur.
 * Qeydiyyatda onu `user_customer_code` BEFORE INSERT trigger-i doldurur, amma
 * sütun DƏYİŞİLƏ BİLƏR — bəzi müştərilərə fərqli prefiks verilir (`EXP...`).
 * Ona görə oxuyan yerlər HƏMİŞƏ sütunu götürməlidir, bu funksiyanı yox.
 *
 * Bu funksiya yalnız formatın TS-dəki əkizidir (trigger-dəki SQL ilə eyni).
 * Format dəyişsə HƏM burada, HƏM miqrasiyadakı trigger-də dəyişməlidir.
 */
export function formatCustomerCode(customerNo: number): string {
  const n = Math.max(0, Math.trunc(customerNo));
  return `${CUSTOMER_CODE_PREFIX}${String(n).padStart(DIGITS, "0")}`;
}

/** Mətnin müştəri kodu olub-olmadığı (anbar/operator yoxlaması üçün). */
export function isCustomerCode(value: string): boolean {
  return new RegExp(`^${CUSTOMER_CODE_PREFIX}\\d{${DIGITS},}$`).test(
    value.trim(),
  );
}

/**
 * "Umid Ismayilov" → { firstName: "Umid", lastName: "Ismayilov" }
 *
 * Tək sözlü ad: Zara hər iki sahəni MƏCBURİ tələb edir, ona görə eyni söz
 * ikisinə də yazılır (boş göndərsək forma qəbul etmir).
 */
export function splitFullName(full: string): {
  firstName: string;
  lastName: string;
} {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/**
 * Zara billing formasına yazılacaq dəyərlər.
 *
 * Ad və soyad OLDUĞU KİMİ gedir, müştəri kodu isə AYRI sahəyə — "Flat number
 * and/or letter" (`addressLines[1]`) sahəsinə yazılır.
 *
 * NİYƏ FLAT SAHƏSİ (əvvəl adın qabağına yazırdım):
 *  · ad sahəsi Zara-da ad kimi doğrulanır; qarışıq mətn formanı sındıra bilər;
 *  · anbar etiketində ünvan bloku bütöv görünür — kod ünvanın bir hissəsi kimi
 *    çap olunur və qutunu açmadan oxunur;
 *  · ad təmiz qalır, müştəri öz adını olduğu kimi görür.
 *
 * `customerNo` yoxdursa kod `null` qayıdır — uydurma kod anbarı səhv müştəriyə
 * yönləndirərdi. Çağıran tərəf bunu yoxlayıb job-u DAYANDIRMALIDIR.
 */
export function zaraRecipientFields(
  customerNo: number | null | undefined,
  fullName: string,
): { firstName: string; lastName: string; code: string | null } {
  const { firstName, lastName } = splitFullName(fullName);
  return {
    firstName,
    lastName,
    code: customerNo == null ? null : formatCustomerCode(customerNo),
  };
}
