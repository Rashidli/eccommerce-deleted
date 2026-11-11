/**
 * AXTARIŞ LÜĞƏTİNİ (`SearchTerm`) doldurur.
 *
 *   npm run search:terms             → lüğəti bazaya yaz (təkrar işlədilə bilər)
 *   npm run search:terms -- --verify → əvvəlcə HƏR açar sözü 1688-də yoxla,
 *                                      nəticə verməyəni YAZMA və siyahıla
 *
 * NİYƏ `--verify` VAR: lüğətin dəyəri açar sözün DOĞRULUĞUNDADIR. Uydurulmuş
 * çincə söz sükutla 0 nəticə verər və problem "axtarış işləmir" kimi geri
 * qayıdardı. Yoxlama bunu seed anında tutur.
 *
 * Seed sətirləri `verified: true` yazılır — yəni AI onların üstündən yazmır.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { AZ_TO_ZH } from "../src/lib/data/search-terms-seed";
import { termKey } from "../src/lib/ai/query-terms";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const LANG = "az";
const TARGET = "zh";

const verify = process.argv.includes("--verify");

/** Açar sözün 1688-də neçə nəticə verdiyini qaytarır (yoxlama rejimi üçün). */
async function count1688(keyword: string): Promise<number | null> {
  const base = process.env.PARTZONA_API_URL ?? "https://api.partzona.com/api/v1";
  const token = process.env.PARTZONA_TOKEN;
  if (!token) return null;

  const url = new URL(`${base}/products/search`);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page", "1");
  url.searchParams.set("per_page", "1");
  url.searchParams.set("keyword_translate", "false");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result?: { result?: { totalRecords?: number } };
    };
    return body.result?.result?.totalRecords ?? 0;
  } catch {
    return null;
  }
}

async function main() {
  let written = 0;
  let skipped = 0;
  const bad: string[] = [];

  for (const concept of AZ_TO_ZH) {
    if (verify) {
      const total = await count1688(concept.keyword);
      // `null` = yoxlaya bilmədik (token/şəbəkə) — bu, açar sözün SƏHV olduğunu
      // sübut etmir, ona görə yazılır. Yalnız SIFIR nəticə rədd edilir.
      if (total === 0) {
        bad.push(concept.keyword);
        skipped += concept.terms.length;
        console.log(`  ✗ ${concept.keyword.padEnd(8)} 0 nəticə — YAZILMADI`);
        continue;
      }
      console.log(
        `  ✓ ${concept.keyword.padEnd(8)} ${total ?? "?"} nəticə · ${concept.terms.length} söz`,
      );
    }

    for (const raw of concept.terms) {
      const term = termKey(raw);
      if (!term) continue;
      await prisma.searchTerm.upsert({
        where: { lang_target_term: { lang: LANG, target: TARGET, term } },
        create: {
          lang: LANG,
          target: TARGET,
          term,
          keyword: concept.keyword,
          verified: true,
        },
        // Seed HƏMİŞƏ üstün gəlir: AI-nın avtomatik yazdığı sətir varsa
        // düzəldilir və `verified` qaldırılır.
        update: { keyword: concept.keyword, verified: true },
      });
      written++;
    }
  }

  console.log(`\nlüğət: ${written} söz yazıldı${skipped ? `, ${skipped} atıldı` : ""}`);
  if (bad.length > 0) {
    console.log(`nəticə verməyən açar sözlər: ${bad.join(", ")}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
