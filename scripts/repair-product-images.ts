/**
 * Bazadakı ikiqat kodlaşmış `Product.images` sahələrini təmir edir.
 *
 * Səbəb: `finalizeProduct` platforma normalizer-inin ARTIQ stringify etdiyi
 * dəyəri bir daha stringify edirdi → `["[\"url1\",\"url2\"]"]`.
 * Kod `normalize-guard.ts`-də düzəldilib; bu skript köhnə sətirləri sağaldır.
 *
 *   npm run products:repair-images
 *   npm run products:repair-images -- --dry
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const dry = process.argv.includes("--dry");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** İç-içə/ikiqat kodlaşmış dəyəri təmiz URL massivinə açır. */
function unwrap(value: unknown, depth = 0): string[] {
  if (!value || depth > 4) return [];

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return [];
    if (text.startsWith("[")) {
      try {
        const parsed: unknown = JSON.parse(text);
        if (Array.isArray(parsed)) return unwrap(parsed, depth + 1);
      } catch {
        /* JSON deyil */
      }
    }
    return [text];
  }

  if (!Array.isArray(value)) {
    const u = (value as { url?: unknown }).url;
    return typeof u === "string" && u.trim() ? [u.trim()] : [];
  }

  const out: string[] = [];
  for (const item of value) {
    for (const url of unwrap(item, depth + 1)) {
      if (!out.includes(url)) out.push(url);
    }
  }
  return out;
}

async function main() {
  const rows = await prisma.product.findMany({
    where: { images: { not: null } },
    select: { id: true, images: true, image: true, source: true },
  });

  let fixed = 0;
  let alreadyOk = 0;

  for (const r of rows) {
    const urls = unwrap(r.images);
    const next = JSON.stringify(urls);

    if (next === r.images) {
      alreadyOk++;
      continue;
    }

    if (!dry) {
      await prisma.product.update({
        where: { id: r.id },
        data: {
          images: next,
          // `image` boş və ya özü korlanmışsa ilk düzgün URL-lə əvəzlənir.
          ...(urls[0] && (!r.image || r.image.startsWith("["))
            ? { image: urls[0] }
            : {}),
        },
      });
    }
    fixed++;
  }

  console.log(
    `${dry ? "[QURU BAXIŞ] " : ""}təmir olundu: ${fixed} · onsuz da düzgün: ${alreadyOk} · cəmi: ${rows.length}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
