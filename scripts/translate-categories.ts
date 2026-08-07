/**
 * Platforma kateqoriya adlarını Gemini ilə az/en/ru-ya çevirir və qısaldır.
 *
 *   npm run categories:translate            → yalnız ƏSAS kateqoriyalar
 *   npm run categories:translate -- --all   → alt kateqoriyalar da daxil
 */
import "dotenv/config";
import { translatePlatformCategories } from "../src/lib/ai/translate-categories";

const all = process.argv.includes("--all");
const platformIdx = process.argv.indexOf("--platform");
const platformKey =
  platformIdx > -1 ? (process.argv[platformIdx + 1] ?? "1688") : "1688";

console.log(
  `tərcümə başlayır — platforma: ${platformKey}, ${all ? "BÜTÜN (alt kateqoriyalar daxil)" : "yalnız əsas"}`,
);

translatePlatformCategories({ platformKey, onlyTopLevel: !all })
  .then((r) => {
    console.log(r);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
