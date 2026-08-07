/**
 * Məhsul adlarını Gemini ilə az/ru-ya çevirir (en olduğu kimi qalır).
 *
 *   npm run products:translate                 → bütün tərcüməsiz məhsullar
 *   npm run products:translate -- --source taobao
 *   npm run products:translate -- --limit 200
 */
import "dotenv/config";
import { translateProductNames } from "../src/lib/ai/translate-products";

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const source = arg("--source");
const limit = arg("--limit") ? Number(arg("--limit")) : undefined;

console.log(
  `məhsul adı tərcüməsi — ${source ? `platforma: ${source}` : "bütün platformalar"}${limit ? `, limit: ${limit}` : ""}`,
);

translateProductNames({ source, limit })
  .then((r) => {
    console.log(r);
    process.exit(r.ok ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
