import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * AZƏRBAYCAN DİAKRİTİKALARININ BƏRPASI — "kisi salvari" → "kişi şalvarı".
 *
 * NİYƏ LAZIM OLDU (ölçülüb): istifadəçilər çox vaxt `ə ş ç ğ ı ö ü` yazmadan
 * axtarır. Tərcüməçi belə sözü TANIMIR və mənasını yox, SƏSİNİ çevirir:
 *
 *     "kisi salvari cins"  → 男性 萨尔瓦里 性别   (şalvar → "salvari" kimi
 *                                                 transliterasiya, cins → "gender")
 *     "kişi şalvarı cins"  → 男裤 牛仔裤          (kişi şalvarı, cins şalvar)
 *
 * Birinci variant 1688-də tamamilə əlaqəsiz nəticə verir.
 *
 * LÜĞƏT HARADAN GƏLİR: uydurulmur və kodda saxlanmır (qayda #4) — ÖZ
 * bazamızdan qurulur. `Product.nameAz` (10 500+ tərcümə olunmuş ad) və
 * `PlatformCategory.nameAz` (1 300+) düzgün azərbaycanca mətndir. Onlardan
 * sözlər çıxarılır, diakritikası silinmiş forma açar olur:
 *
 *     "şalvarı" (178 dəfə rast gəlir)  →  açar "salvari"
 *
 * Ölçüldü: 5067 açar, cəmi 25 konflikt, ~276 KB yaddaş, qurulma ~280 ms.
 * Lüğət kataloq böyüdükcə ÖZÜ zənginləşir — əl ilə saxlanma tələb etmir.
 *
 * KONFLİKT: eyni ASCII forma iki fərqli sözə uyğun gələ bilər (məs. "sal" →
 * "şal" və ya "sal"). Ən çox rast gəlinən forma seçilir — məhsul axtarışında
 * tezlik yaxşı göstəricidir.
 */

/** Diakritikaları ASCII qarşılığı ilə əvəz edir. */
const FOLD: Record<string, string> = {
  ə: "e",
  ş: "s",
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ü: "u",
  İ: "i",
};

const AZ_DIACRITIC = /[əşçğıöüƏŞÇĞİÖÜ]/;

/** Ən qısa nəzərə alınan söz. 3-dən qısa sözlər (məs. "və") məna daşımır. */
const MIN_WORD = 3;

/**
 * Lüğətin təzələnmə müddəti. Kataloq daim böyüyür, amma lüğət sürətlə
 * dəyişmir — 6 saat həm təzə, həm ucuzdur.
 */
const TTL_MS = 6 * 60 * 60_000;

export function foldAz(word: string): string {
  let out = "";
  for (const ch of word) out += FOLD[ch] ?? ch;
  return out;
}

type Lexicon = Map<string, string>;

let cached: Lexicon | null = null;
let cachedAt = 0;
/** Eyni anda gələn sorğular lüğəti İKİ DƏFƏ qurmasın. */
let building: Promise<Lexicon> | null = null;

async function build(): Promise<Lexicon> {
  const rows = await prisma.$queryRaw<{ n: string | null }[]>`
    SELECT "nameAz" AS n FROM "Product"
      WHERE "nameAz" ~ '[əşçğıöüƏŞÇĞİÖÜ]'
    UNION ALL
    SELECT "nameAz" AS n FROM "PlatformCategory"
      WHERE "nameAz" ~ '[əşçğıöüƏŞÇĞİÖÜ]'
  `;

  // Əvvəlcə tezlik: eyni söz neçə dəfə rast gəlir.
  const freq = new Map<string, number>();
  for (const row of rows) {
    if (!row.n) continue;
    for (const word of row.n.toLowerCase().split(/[^\p{L}]+/u)) {
      if (word.length < MIN_WORD) continue;
      if (!AZ_DIACRITIC.test(word)) continue;
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }

  // Sonra açar: hər ASCII forma üçün ƏN ÇOX rast gəlinən düzgün yazılış.
  const lexicon: Lexicon = new Map();
  const counts = new Map<string, number>();
  for (const [word, count] of freq) {
    const key = foldAz(word);
    if (key === word) continue; // diakritikası yoxdursa bərpa ediləsi bir şey yoxdur
    if ((counts.get(key) ?? 0) >= count) continue;
    counts.set(key, count);
    lexicon.set(key, word);
  }

  return lexicon;
}

async function lexicon(): Promise<Lexicon> {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  building ??= build()
    .then((lex) => {
      cached = lex;
      cachedAt = Date.now();
      return lex;
    })
    .finally(() => {
      building = null;
    });
  return building;
}

/**
 * Sorğudakı diakritikasız sözləri düzgün yazılışla əvəz edir.
 *
 * YALNIZ sorğuda HEÇ BİR diakritika olmayanda işə düşür. Səbəb: "şalvar cins"
 * yazan istifadəçi əlifbanı bilir, orada "cins"i "çins"ə çevirmək səhv olardı.
 * Diakritikasız sorğu isə aydın siqnaldır — istifadəçi ASCII yazır.
 *
 * Tapılmayan söz OLDUĞU KİMİ qalır: "qara", "cins", "noutbuk" kimi sözlərin
 * diakritikası onsuz da yoxdur.
 *
 * Xəta halında orijinal sorğu qaytarılır — bərpa köməkçi addımdır, axtarışı
 * dayandırmamalıdır.
 */
export async function restoreAzDiacritics(query: string): Promise<string> {
  if (!query || AZ_DIACRITIC.test(query)) return query;

  try {
    const lex = await lexicon();
    if (lex.size === 0) return query;

    // Ayırıcılar (boşluq, tire, vergül) qorunur — yalnız sözlər əvəzlənir.
    return query.replace(/\p{L}+/gu, (word) => {
      if (word.length < MIN_WORD) return word;
      const hit = lex.get(word.toLowerCase());
      return hit ?? word;
    });
  } catch {
    return query;
  }
}
