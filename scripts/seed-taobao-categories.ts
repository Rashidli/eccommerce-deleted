/**
 * Taobao-nun ÖZ kateqoriya ağacını qurur (Gemini), 1688-dən kopyalanmış
 * sətirləri silir, görünmə bayraqlarını qoyur və şəkilləri generasiya edir.
 *
 * Partzona-da Taobao kateqoriya endpoint-i yoxdur — ağac bizdə saxlanır,
 * baxış isə `nameZh` ilə axtarışa çevrilir.
 *
 *   npm run categories:taobao              → ağac + bayraqlar + şəkillər
 *   npm run categories:taobao -- --no-images   → şəkilsiz
 *   npm run categories:taobao -- --keep-copies → köhnə kopyaları silmə
 *
 * İdempotentdir — təkrar işlətmək təhlükəsizdir.
 */
import "dotenv/config";
import {
  generateTaobaoCategories,
  setTaobaoVisibility,
} from "../src/lib/ai/generate-taobao-categories";
import { generateCategoryImages } from "../src/lib/ai/generate-category-images";

const noImages = process.argv.includes("--no-images");
const keepCopies = process.argv.includes("--keep-copies");

async function main() {
  console.log("Taobao kateqoriya ağacı qurulur (Gemini)…");
  const tree = await generateTaobaoCategories({ keepCopies });
  console.log(
    `  ağac → əsas: ${tree.topLevel}, alt: ${tree.subs}, silinən kopya: ${tree.removedCopies}`,
  );
  if (!tree.ok) {
    console.error(`  XƏTA: ${tree.message}`);
    process.exit(1);
  }

  const vis = await setTaobaoVisibility();
  console.log(`  görünmə → nav: ${vis.nav}, ana səhifə: ${vis.home}`);

  if (noImages) {
    console.log("  şəkillər ötürüldü (--no-images)");
    return;
  }

  console.log("Şəkillər generasiya olunur (yalnız şəkli olmayanlar)…");
  const img = await generateCategoryImages({ platformKey: "taobao" });
  console.log(`  şəkil → uğurlu: ${img.generated}, uğursuz: ${img.failed}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
