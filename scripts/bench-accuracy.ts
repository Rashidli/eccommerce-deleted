/**
 * DİAQNOSTİKA — eyni məqsədli sorğunun MÜXTƏLİF DİLLƏRDƏ hansı nəticə
 * verdiyini göstərir. Məqsəd: 1688 axtarışının hansı dili doğru başa
 * düşdüyünü təcrübə ilə müəyyən etmək.
 *
 *   npm run bench:accuracy
 */
import "dotenv/config";
import { search1688 } from "../src/lib/partzona/endpoints";
import { extract1688Search } from "../src/lib/partzona/platforms/1688/normalize";

const CASES: { label: string; keyword: string; translate: boolean }[] = [
  { label: "az (diakritikasız)", keyword: "qadin koynek", translate: true },
  { label: "az (düzgün)", keyword: "qadın köynəyi", translate: true },
  { label: "en", keyword: "women blouse shirt", translate: true },
  { label: "ru", keyword: "женская рубашка", translate: true },
  { label: "zh (tərcüməsiz)", keyword: "女式衬衫", translate: false },
];

async function main() {
  for (const c of CASES) {
    try {
      const res = await search1688({
        keyword: c.keyword,
        page: 1,
        per_page: 5,
        lang: "az",
        keyword_translate: c.translate,
      });
      const { items, total } = extract1688Search(res);
      console.log(`\n─── ${c.label}  "${c.keyword}"  (cəmi: ${total}) ───`);
      for (const it of items.slice(0, 5)) {
        const r = it as Record<string, unknown>;
        const name =
          (r.subject as string) ?? (r.title as string) ?? (r.name as string) ?? "?";
        console.log(`   · ${String(name).slice(0, 80)}`);
      }
    } catch (err) {
      console.log(`\n─── ${c.label}  "${c.keyword}" → XƏTA: ${(err as Error).message}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
