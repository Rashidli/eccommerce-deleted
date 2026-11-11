/**
 * DİAQNOSTİKA — axtarış boru xəttinin mərhələ vaxtlarını ölçür.
 * İstifadə: npm run bench:search -- "stol" "lampa"
 */
import "dotenv/config";
import { translateQuery } from "../src/lib/ai/translate";
import { getPlatformService } from "../src/lib/partzona/platforms";
import { importPartzonaSearch } from "../src/lib/partzona/search";
import { getProductsByIds } from "../src/lib/data/catalog";

const ms = (t: bigint) => Number(process.hrtime.bigint() - t) / 1e6;

async function main() {
  const queries = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (queries.length === 0) queries.push("stol");

  const service = getPlatformService("1688");
  if (!service) throw new Error("1688 servisi yoxdur");

  for (const q of queries) {
    console.log(`\n─── "${q}" ───`);

    let t = process.hrtime.bigint();
    const tr = await translateQuery(q, "az", service.searchLang);
    const tTranslate = ms(t);
    console.log(
      `  tərcümə      ${tTranslate.toFixed(0).padStart(6)} ms   → "${tr.keyword}"  (uğurlu: ${tr.translated})`,
    );

    t = process.hrtime.bigint();
    const res = await service.search({
      keyword: tr.keyword,
      translated: tr.translated,
      lang: "az",
      page: 1,
      perPage: 20,
    });
    const tSearch = ms(t);
    console.log(
      `  tədarükçü    ${tSearch.toFixed(0).padStart(6)} ms   → ${res.ok ? `${res.products.length} məhsul` : `XƏTA: ${res.message}`}`,
    );

    // Tam idxal (tərcümə + tədarükçü + DB upsert) — fərq DB yazmasıdır.
    t = process.hrtime.bigint();
    const live = await importPartzonaSearch({ query: q, lang: "az", platform: "1688" });
    const tImport = ms(t);

    t = process.hrtime.bigint();
    if (live.productIds.length > 0) await getProductsByIds(live.productIds, "az");
    const tFetch = ms(t);

    const tDb = Math.max(0, tImport - tTranslate - tSearch);
    console.log(`  DB yazma   ~ ${tDb.toFixed(0).padStart(6)} ms`);
    console.log(`  DB oxuma     ${tFetch.toFixed(0).padStart(6)} ms   → ${live.productIds.length} məhsul`);
    console.log(`  ── cəmi      ${(tImport + tFetch).toFixed(0).padStart(6)} ms`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
