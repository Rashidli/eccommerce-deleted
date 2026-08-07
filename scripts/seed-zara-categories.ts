/**
 * Zara-nın ÖZ kateqoriya ağacını API-dən çəkib DB-yə yazır, tərcümə edir,
 * görünmə bayraqlarını qoyur və şəkilləri generasiya edir.
 *
 * Taobao-dan fərqli olaraq Zara-da REAL kateqoriya endpoint-i var (kopyalamırıq).
 *
 *   npm run categories:zara                 → ağac + tərcümə + bayraqlar + şəkillər
 *   npm run categories:zara -- --no-images      → şəkilsiz
 *   npm run categories:zara -- --no-translate   → tərcüməsiz
 *
 * İdempotentdir — təkrar işlətmək təhlükəsizdir.
 */
import "dotenv/config";
import {
  seedZaraCategories,
  setZaraVisibility,
  ensureZaraPlatform,
} from "../src/lib/partzona/platforms/zara/seed-categories";
import { translatePlatformCategories } from "../src/lib/ai/translate-categories";
import { generateCategoryImages } from "../src/lib/ai/generate-category-images";

const noImages = process.argv.includes("--no-images");
const noTranslate = process.argv.includes("--no-translate");

async function main() {
  console.log("Zara platform sətri yoxlanılır…");
  await ensureZaraPlatform();

  console.log("Zara kateqoriya ağacı API-dən çəkilir…");
  const tree = await seedZaraCategories();
  console.log(`  ağac → əsas: ${tree.topLevel}, alt: ${tree.subs}, silinən köhnə: ${tree.removed}`);
  if (!tree.ok) {
    console.error(`  XƏTA: ${tree.message}`);
    process.exit(1);
  }

  const vis = await setZaraVisibility();
  console.log(`  görünmə → nav: ${vis.nav}, ana səhifə: ${vis.home}`);

  if (!noTranslate) {
    console.log("Kateqoriya adları az/ru/en tərcümə olunur (Gemini)…");
    const tr = await translatePlatformCategories({
      platformKey: "zara",
      onlyTopLevel: false,
    });
    console.log(`  tərcümə → yenilənən: ${tr.updated}${tr.message ? " · " + tr.message : ""}`);
  }

  if (noImages) {
    console.log("  şəkillər ötürüldü (--no-images)");
    return;
  }

  console.log("Şəkillər generasiya olunur (yalnız şəkli olmayan əsas kateqoriyalar)…");
  const img = await generateCategoryImages({ platformKey: "zara" });
  console.log(`  şəkil → uğurlu: ${img.generated}, uğursuz: ${img.failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
