import "server-only";
import { prisma } from "@/lib/prisma";
import { foldAz } from "@/lib/ai/az-diacritics";
import type { Lang } from "@/lib/i18n";
import type { SearchLang } from "@/lib/ai/translate-target";

/**
 * AXTARIŞ LÜĞƏTİ — danışıq dilindəki sözü platformanın açar sözünə bağlayır.
 *
 * Cədvəl `SearchTerm`-dir (bax `prisma/schema.prisma`), burada isə onun
 * OXUNMA qatı var: bütöv lüğət yaddaşa alınır, çünki axtarışın qarşısındadır
 * və hər sorğuda bazaya getmək gecikmə yaradardı.
 *
 * NİYƏ AI-DAN ƏVVƏL GƏLİR: lüğət həm SÜRƏTLİDİR (şəbəkə yoxdur), həm də
 * DƏQİQDİR — "sumka"nın 女包 olduğunu bir dəfə təsdiqləyəndən sonra bunu hər
 * dəfə modeldən soruşmağın mənası yoxdur. AI yalnız lüğətdə OLMAYAN söz üçün
 * işə düşür, nəticəsi isə geri lüğətə yazılır (`rememberTerm`).
 */

/** Lüğətin təzələnmə müddəti — `az-diacritics` ilə eyni məntiq. */
const TTL_MS = 6 * 60 * 60_000;

export type TermHit = {
  /** Platformaya göndəriləcək açar söz. */
  keyword: string;
  /** true — seed/admin təsdiqləyib (AI bunun üstündən yazmır). */
  verified: boolean;
  /** Lüğətdəki sətrin öz forması — `hits` artırmaq üçün lazımdır. */
  term: string;
  /** Yazılış tam üst-üstə düşdü, yoxsa yaxınlıq (fuzzy) ilə tapıldı. */
  fuzzy: boolean;
};

/**
 * Sorğu sözünü lüğət AÇARINA çevirir: kiçik hərf + diakritikasız + təmiz.
 *
 * DİQQƏT — "İ" ƏL İLƏ əvəzlənir: JavaScript-də `"İ".toLowerCase()` nöqtəni
 * AYRICA birləşdirici işarə kimi saxlayır ("i" + U+0307), yəni nəticə adi "i"
 * ilə bərabər olmur və lüğət açarı heç vaxt tutmur. Azərbaycan mətnində bu
 * hərf çox keçdiyi üçün səssiz sınma olardı.
 */
export function termKey(text: string): string {
  return foldAz(text.replace(/İ/g, "i").toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

type Dictionary = {
  /** `${lang}:${term}` → sətir. */
  byKey: Map<string, TermHit>;
  /** Dilə görə açarlar — fuzzy axtarış yalnız öz dilinin sözlərinə baxsın. */
  termsByLang: Map<string, string[]>;
  /** Lüğətdəki ən uzun ifadə (neçə söz) — n-gram axtarışının həddi. */
  maxWords: number;
};

let cached: Dictionary | null = null;
let cachedAt = 0;
/** Eyni anda gələn sorğular lüğəti iki dəfə qurmasın. */
let building: Promise<Dictionary> | null = null;

async function build(target: SearchLang): Promise<Dictionary> {
  const rows = await prisma.searchTerm.findMany({
    where: { target },
    select: { lang: true, term: true, keyword: true, verified: true },
  });

  const byKey = new Map<string, TermHit>();
  const termsByLang = new Map<string, string[]>();
  let maxWords = 1;

  for (const row of rows) {
    byKey.set(`${row.lang}:${row.term}`, {
      keyword: row.keyword,
      verified: row.verified,
      term: row.term,
      fuzzy: false,
    });

    const list = termsByLang.get(row.lang);
    if (list) list.push(row.term);
    else termsByLang.set(row.lang, [row.term]);

    const words = row.term.split(" ").length;
    if (words > maxWords) maxWords = words;
  }

  return { byKey, termsByLang, maxWords };
}

/**
 * Lüğət hədəf dilə görə qurulur, amma keş TƏKDİR — praktikada eyni anda bir
 * platforma aktivdir. Hədəf dəyişsə keş yenidən qurulur (ucuzdur).
 */
let cachedTarget: SearchLang | null = null;

async function dictionary(target: SearchLang): Promise<Dictionary> {
  if (cached && cachedTarget === target && Date.now() - cachedAt < TTL_MS) {
    return cached;
  }
  building ??= build(target)
    .then((dict) => {
      cached = dict;
      cachedAt = Date.now();
      cachedTarget = target;
      return dict;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

/** Lüğət dəyişəndə (admin/AI yazanda) keşi dərhal etibarsız edir. */
export function invalidateTermCache(): void {
  cached = null;
  cachedAt = 0;
  cachedTarget = null;
}

/* ------------------------------ FUZZY UYĞUNLUQ ------------------------------ */

/**
 * NİYƏ FUZZY LAZIMDIR: eyni sözü hər müştəri başqa cür yazır —
 * "basanojka" / "pasanojka" / "pasaniska". Hamısını lüğətə salmaq mümkün deyil.
 *
 * Hədd sözün UZUNLUĞUNA bağlıdır: qısa sözdə 2 səhv artıq BAŞQA sözdür
 * ("qara" → "qaba"), uzun sözdə isə 2 səhv adi yazılış fərqidir.
 */
function maxDistance(len: number): number {
  if (len >= 7) return 2;
  if (len >= 5) return 1;
  return 0;
}

/**
 * Levenshtein məsafəsi, `limit`-dən böyüyəndə DAYANIR.
 *
 * Erkən dayanma vacibdir: lüğət minlərlə sətrə çata bilər və hər axtarışda
 * hamısı ilə tam məsafə hesablamaq axtarışı yavaşladardı.
 */
function distanceWithin(a: string, b: string, limit: number): number | null {
  if (Math.abs(a.length - b.length) > limit) return null;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    // Bütün sətir həddi aşıbsa, sonrakı sətirlər yalnız böyüyəcək.
    if (rowMin > limit) return null;
    [prev, curr] = [curr, prev];
  }

  const d = prev[b.length];
  return d <= limit ? d : null;
}

function fuzzyLookup(
  dict: Dictionary,
  lang: Lang,
  key: string,
): TermHit | null {
  const limit = maxDistance(key.length);
  if (limit === 0) return null;

  const terms = dict.termsByLang.get(lang);
  if (!terms) return null;

  let best: TermHit | null = null;
  let bestDistance = limit + 1;

  for (const term of terms) {
    // Çoxsözlü ifadələr fuzzy axtarışa girmir — tək sözün yazılış fərqini
    // tuturuq, cümlə quruluşunu yox.
    if (term.includes(" ")) continue;
    const d = distanceWithin(key, term, limit);
    if (d === null || d >= bestDistance) continue;
    bestDistance = d;
    const row = dict.byKey.get(`${lang}:${term}`);
    if (row) best = { ...row, fuzzy: true };
  }

  return best;
}

/* -------------------------------- OXUMA API -------------------------------- */

/** Tək sözü (və ya ifadəni) lüğətdə axtarır — əvvəl dəqiq, sonra fuzzy. */
export async function lookupTerm(
  phrase: string,
  lang: Lang,
  target: SearchLang,
): Promise<TermHit | null> {
  const key = termKey(phrase);
  if (!key) return null;

  const dict = await dictionary(target);
  const exact = dict.byKey.get(`${lang}:${key}`);
  if (exact) return exact;

  return key.includes(" ") ? null : fuzzyLookup(dict, lang, key);
}

/** Lüğətdəki ən uzun ifadənin söz sayı — n-gram axtarışı üçün. */
export async function maxPhraseWords(target: SearchLang): Promise<number> {
  return (await dictionary(target)).maxWords;
}

/** Lüğətin bu dil üçün ümumiyyətlə sətri varmı (boş bazada işi atlamaq üçün). */
export async function hasTerms(target: SearchLang): Promise<boolean> {
  return (await dictionary(target)).byKey.size > 0;
}

/* -------------------------------- YAZMA API -------------------------------- */

/**
 * AI-nın tapdığı tərcüməni lüğətə yazır — lüğət işlədikcə ÖZÜ böyüyür.
 *
 * TƏSDİQLƏNMİŞ SƏTİR QORUNUR: `verified` sətrin üstündən yazmırıq. Səbəb —
 * model bir dəfə səhv cavab versə (məs. "çanta" → ayaqqabı), o səhv lüğətə
 * düşüb HƏMİŞƏLİK qalardı və artıq düzəldilmiş sözü yenidən korlayardı.
 */
export async function rememberTerm(opts: {
  phrase: string;
  lang: Lang;
  target: SearchLang;
  keyword: string;
}): Promise<void> {
  const term = termKey(opts.phrase);
  const keyword = opts.keyword.trim();
  if (!term || !keyword) return;

  try {
    const existing = await prisma.searchTerm.findUnique({
      where: {
        lang_target_term: { lang: opts.lang, target: opts.target, term },
      },
      select: { verified: true },
    });
    if (existing?.verified) return;

    await prisma.searchTerm.upsert({
      where: {
        lang_target_term: { lang: opts.lang, target: opts.target, term },
      },
      create: { lang: opts.lang, target: opts.target, term, keyword },
      update: { keyword },
    });
    invalidateTermCache();
  } catch {
    // Lüğətə yazmaq KÖMƏKÇİ addımdır — uğursuzluğu axtarışı dayandırmamalıdır.
  }
}

/**
 * İstifadə sayğacını artırır (admin hansı sözün vacib olduğunu görsün).
 * Cavabı GÖZLƏMİRİK — axtarışın gecikməsinə əlavə etməyin mənası yoxdur.
 */
export function bumpTermHits(
  terms: { term: string; lang: Lang }[],
  target: SearchLang,
): void {
  if (terms.length === 0) return;
  void Promise.all(
    terms.map((t) =>
      prisma.searchTerm
        .updateMany({
          where: { lang: t.lang, target, term: t.term },
          data: { hits: { increment: 1 } },
        })
        .catch(() => {
          /* sayğac — sınsa da axtarışa təsiri yoxdur */
        }),
    ),
  );
}
