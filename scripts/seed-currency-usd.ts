/**
 * VAHİD GÖSTƏRİŞ VALYUTASI = USD.
 *
 *   npm run currency:usd
 *
 * Nə edir:
 *   1) `CurrencySettings.displayCurrency = "USD"` — bütün saytda tək valyuta.
 *   2) CNY→USD və EUR→USD məzənnələrini yazır.
 *
 * MƏZƏNNƏ HARDAN GƏLİR: bazada artıq CNY→AZN və EUR→AZN var. Manat ABŞ
 * dollarına TƏSBİT olunub (1 USD = 1.70 AZN, Mərkəzi Bankın sabit kursu), ona
 * görə USD məzənnəsi bu sətirlərdən dəqiq çıxarılır — rəqəm uydurulmur:
 *
 *     X→USD = (X→AZN) / 1.70
 *
 * AZN sətri yoxdursa həmin cüt YAZILMIR: səhv məzənnə ilə qiymət göstərmək
 * heç göstərməməkdən pisdir (çevirmə qatı məzənnə tapmayanda məhsulu öz
 * valyutasında göstərir).
 *
 * Məzənnələr sonradan `/admin/currency` səhifəsindən dəyişdirilir — bu skript
 * yalnız başlanğıc dəyəri qoyur.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

/** Manatın dollara təsbit edilmiş kursu (AZN / 1 USD). */
const AZN_PER_USD = 1.7;

const DISPLAY_CURRENCY = "USD";

async function main() {
  await prisma.currencySettings.upsert({
    where: { id: "default" },
    create: { id: "default", displayCurrency: DISPLAY_CURRENCY, markupBps: 0 },
    // `markupBps`-a TOXUNMURUQ — admin marja qoyubsa sıfırlanmasın.
    update: { displayCurrency: DISPLAY_CURRENCY },
  });
  console.log(`displayCurrency → ${DISPLAY_CURRENCY}`);

  // AZN→USD təsbit kursdan BİRBAŞA gəlir (yerli çatdırılma haqqı AZN-dir və
  // o da vahid valyutada göstərilməlidir).
  const aznToUsd = Number((1 / AZN_PER_USD).toFixed(6));
  await prisma.exchangeRate.upsert({
    where: { base_quote: { base: "AZN", quote: DISPLAY_CURRENCY } },
    create: { base: "AZN", quote: DISPLAY_CURRENCY, rate: aznToUsd },
    update: { rate: aznToUsd },
  });
  console.log(`AZN→${DISPLAY_CURRENCY} = ${aznToUsd}  (təsbit kurs)`);

  const aznRates = await prisma.exchangeRate.findMany({
    where: { quote: "AZN" },
  });

  if (aznRates.length === 0) {
    console.log(
      "XƏBƏRDARLIQ: bazada AZN məzənnəsi yoxdur — USD məzənnəsi çıxarıla bilmir.",
    );
    console.log("Məzənnələri /admin/currency səhifəsindən əl ilə yazın.");
    return;
  }

  for (const r of aznRates) {
    const rate = Number((r.rate / AZN_PER_USD).toFixed(6));
    await prisma.exchangeRate.upsert({
      where: { base_quote: { base: r.base, quote: DISPLAY_CURRENCY } },
      create: { base: r.base, quote: DISPLAY_CURRENCY, rate },
      update: { rate },
    });
    console.log(`${r.base}→${DISPLAY_CURRENCY} = ${rate}  (${r.base}→AZN ${r.rate} / ${AZN_PER_USD})`);
  }

  console.log(
    "\nDİQQƏT: bunlar AZN sətirlərindən çıxarılıb. Real kursu /admin/currency-də yoxlayın.",
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
