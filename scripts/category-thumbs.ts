/**
 * Mövcud kateqoriya şəkilləri üçün 128px MİNİATÜR yaradır.
 *
 * Niyə lazımdır: miniatürlər `lib/images/category-image.ts`-də yazma anında
 * yaranır, amma bu qayda əlavə olunanadək yüklənmiş şəkillərin miniatürü
 * yoxdur. Skript geridə qalanları tamamlayır — bir dəfə işlədilir, sonra
 * yalnız köhnə fayl tapılsa lazım olur.
 *
 * İstifadə:
 *   npm run categories:thumbs           → yalnız çatışmayanları yaradır
 *   npm run categories:thumbs -- --force → hamısını yenidən yaradır
 */
import { readdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  CATEGORY_IMAGE_DIR,
  CATEGORY_THUMB_SIZE,
} from "../src/lib/images/category-image";

const THUMB = "-thumb.webp";

async function exists(file: string) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const force = process.argv.includes("--force");

  // Miniatürlərin ÖZÜ mənbə sayılmır — əks halda `-thumb-thumb` yaranardı.
  const files = (await readdir(CATEGORY_IMAGE_DIR)).filter(
    (f) => f.endsWith(".webp") && !f.endsWith(THUMB),
  );

  let made = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of files) {
    const base = file.slice(0, -".webp".length);
    const out = path.join(CATEGORY_IMAGE_DIR, `${base}${THUMB}`);

    if (!force && (await exists(out))) {
      skipped++;
      continue;
    }

    try {
      const buf = await readFile(path.join(CATEGORY_IMAGE_DIR, file));
      const thumb = await sharp(buf)
        .resize(CATEGORY_THUMB_SIZE, CATEGORY_THUMB_SIZE, {
          fit: "cover",
          position: "centre",
        })
        .webp({ quality: 80 })
        .toBuffer();
      await writeFile(out, thumb);
      made++;
    } catch (err) {
      // Bir zədəli fayl qalanları dayandırmır.
      failed++;
      console.warn(`  ! ${file}: ${(err as Error).message}`);
    }
  }

  console.log(
    `Miniatür: ${made} yaradıldı, ${skipped} onsuz da vardı, ${failed} alınmadı (${files.length} şəkil).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
