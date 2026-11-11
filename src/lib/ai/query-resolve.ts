import "server-only";
import {
  lookupTerm,
  maxPhraseWords,
  hasTerms,
  termKey,
  bumpTermHits,
} from "@/lib/ai/query-terms";
import type { Lang } from "@/lib/i18n";
import type { SearchLang } from "@/lib/ai/translate-target";

/**
 * SORĞUNUN LÜĞƏTLƏ HƏLLİ — tərcüməçidən ƏVVƏLKİ addım.
 *
 * Sorğu sözlərə bölünür və hər söz lüğətdə axtarılır. Tapılan söz DƏRHAL
 * platformanın açar sözü ilə əvəzlənir, tapılmayan söz isə OLDUĞU KİMİ qalır.
 *
 * ƏSAS QƏRAR — TAPILMAYAN SÖZ TƏRCÜMƏ EDİLMİR, SAXLANILIR.
 *
 * Əvvəlcə "brend siyahısı qurub gucci-ni tanıyaq" deyə düşünmüşdüm, amma
 * ölçmə göstərdi ki, buna EHTİYAC YOXDUR — sadəcə naməlum sözü toxunmadan
 * saxlamaq kifayətdir, çünki 1688 latın hərfli brend adını özü tanıyır:
 *
 *     'gucci sumka'    → 0     nəticə   (bugünkü davranış)
 *     'gucci 女包'      → 300   nəticə, hamısı Gucci çantası
 *     'nike krossovka' → 0     nəticə
 *     'nike 运动鞋'      → 2000  nəticə, hamısı krossovka
 *
 * Yəni "brendi tanımaq" problemi əslində "brendi TƏRCÜMƏ ETMƏMƏK" problemidir.
 * Heç bir brend siyahısı saxlamırıq — nə kodda, nə bazada — və buna görə
 * sistem tanımadığı YENİ brendlə də ilk gündən işləyir.
 *
 * ÇOXSÖZLÜ İFADƏLƏR: lüğətdə "qadin sumkasi" kimi ifadə də ola bilər, ona görə
 * axtarış AC GÖZLÜ UZUN-ƏVVƏL gedir — əvvəl ən uzun n-gram sınanır, sonra
 * qısalır. Əks halda "qadin sumkasi" heç vaxt tutmazdı, çünki "sumka" tək
 * sözü daha tez uyğun gələrdi.
 */

export type ResolvedPart =
  | { kind: "keyword"; text: string; term: string }
  | { kind: "unresolved"; text: string };

export type DictionaryResolution = {
  parts: ResolvedPart[];
  /** Ən azı bir söz lüğətdən tapıldımı. */
  matched: boolean;
  /** Lüğətdə tapılmayan sözlər — tərcüməçiyə yalnız bunlar gedir. */
  unresolved: string[];
};

/** Boş nəticə — lüğət boş olanda və ya sorğu boş olanda. */
const NONE: DictionaryResolution = {
  parts: [],
  matched: false,
  unresolved: [],
};

export async function resolveFromDictionary(
  query: string,
  lang: Lang,
  target: SearchLang,
): Promise<DictionaryResolution> {
  const normalized = termKey(query);
  if (!normalized) return NONE;

  // Lüğət hələ doldurulmayıbsa (məs. seed işlədilməyib) heç nə etmirik —
  // axın dəyişmədən köhnə davranışa düşür.
  if (!(await hasTerms(target))) return NONE;

  const words = normalized.split(" ");
  const maxWords = Math.min(await maxPhraseWords(target), words.length);

  const parts: ResolvedPart[] = [];
  const unresolved: string[] = [];
  const usedTerms: { term: string; lang: Lang }[] = [];

  let i = 0;
  while (i < words.length) {
    let hit = null as Awaited<ReturnType<typeof lookupTerm>>;
    let span = 0;

    // AC GÖZLÜ UZUN-ƏVVƏL: ən uzun ifadədən başlayıb tək sözə qədər enirik.
    for (let n = Math.min(maxWords, words.length - i); n >= 1; n--) {
      const phrase = words.slice(i, i + n).join(" ");
      const found = await lookupTerm(phrase, lang, target);
      if (found) {
        hit = found;
        span = n;
        break;
      }
    }

    if (hit) {
      parts.push({ kind: "keyword", text: hit.keyword, term: hit.term });
      usedTerms.push({ term: hit.term, lang });
      i += span;
      continue;
    }

    parts.push({ kind: "unresolved", text: words[i] });
    unresolved.push(words[i]);
    i += 1;
  }

  // Sayğac fon işidir — cavabı gözləmirik.
  bumpTermHits(usedTerms, target);

  return { parts, matched: usedTerms.length > 0, unresolved };
}

/**
 * Hissələri platformaya göndəriləcək açar sözə birləşdirir.
 *
 * `skipUnresolved` — 0 nəticə gələndə istifadə olunan GENİŞLƏNDİRMƏ rejimi:
 * naməlum sözlər (adətən brend) atılır, yalnız lüğətdən gələn açar sözlər
 * qalır. Ölçüldü: `gucci 女包` → 300, `女包` → 2000. Yəni brend nəticəni
 * daraldır — tam sıfırlayanda ondan imtina etmək məntiqlidir.
 */
export function joinParts(
  parts: ResolvedPart[],
  opts: { skipUnresolved?: boolean } = {},
): string {
  return parts
    .filter((p) => !(opts.skipUnresolved && p.kind === "unresolved"))
    .map((p) => p.text)
    .join(" ")
    .trim();
}
