/**
 * MƏZƏNNƏLƏRİ YENİLƏ — Mərkəzi Bankdan (CBAR).
 *
 *   npm run rates:refresh
 *
 * Hər gün cron ilə işlədilməlidir; qiymətlər "həmin günün məzənnəsi" ilə
 * görünsün deyə. Bir dəfə əl ilə də işlədilə bilər.
 *
 * NƏ YAZILIR: aktiv platformaların valyutaları (`Platform.currency`) + yerli
 * AZN → mağazanın göstəriş valyutasına (`CurrencySettings.displayCurrency`).
 * Kodda valyuta siyahısı SABİT DEYİL — yeni platforma əlavə olunanda onun
 * valyutası avtomatik daxil olur (qayda #4).
 *
 * CBAR əlçatmazdırsa heç nə yazılmır: köhnə məzənnə qalır. Uydurma dəyərlə
 * qiymət göstərmək müştərini aldatmaqdır.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { fetchCbarRates, crossRate } from "../src/lib/currency/cbar";

async function main() {
  const settings = await prisma.currencySettings.findUnique({
    where: { id: "default" },
  });
  const quote = settings?.displayCurrency;
  if (!quote) {
    console.log(
      "Göstəriş valyutası təyin olunmayıb (/admin/currency) — çevirmə söndürülüb, məzənnəyə ehtiyac yoxdur.",
    );
    return;
  }

  const rates = await fetchCbarRates();
  if (!rates) {
    console.error("CBAR-dan məzənnə alınmadı — mövcud məzənnələr saxlanıldı.");
    process.exitCode = 1;
    return;
  }

  // Hansı valyutalar lazımdır: platformaların valyutaları + yerli çatdırılma (AZN).
  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    select: { currency: true },
  });
  const bases = new Set<string>(["AZN"]);
  for (const p of platforms) if (p.currency) bases.add(p.currency.toUpperCase());
  bases.delete(quote.toUpperCase());

  console.log(`CBAR bülleteni: ${rates.date} · hədəf: ${quote}`);

  let written = 0;
  for (const base of bases) {
    const rate = crossRate(rates, base, quote);
    if (rate == null) {
      console.log(`  ${base}→${quote}: CBAR-da yoxdur — ATLANILDI`);
      continue;
    }
    const value = Number(rate.toFixed(6));
    await prisma.exchangeRate.upsert({
      where: { base_quote: { base, quote } },
      create: { base, quote, rate: value },
      update: { rate: value },
    });
    console.log(`  ${base}→${quote} = ${value}`);
    written++;
  }

  console.log(`${written} məzənnə yeniləndi.`);
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
