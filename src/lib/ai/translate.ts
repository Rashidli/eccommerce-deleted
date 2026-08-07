import "server-only";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { Lang } from "@/lib/i18n";

// AI tərcümə: istifadəçinin sorğusu PLATFORMANIN danışdığı dilə çevrilir.
//   · 1688 / Taobao → çincə (zh)   · Zara → ispanca (es)
//
// Niyə vacibdir: platformalar öz dilində qat-qat çox nəticə verir.
// Canlı ölçmə — "shirt": çincə 衬衫 ilə Zara 300, ispanca "camisa" ilə 1157
// nəticə qaytardı. Yəni yanlış dil kataloqun ~75%-ni gizlədirdi.
//
// Provayder `AI_PROVIDER` ilə seçilir: "gemini" (default) | "openai".
// Açar yoxdursa tərcümə edilmir — çağıran tərəf platformanın öz
// tərcüməsinə düşür. Hər şey YALNIZ serverdə (qayda #2).

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/** Platformanın axtarış dili — `PlatformService.searchLang` ilə eyni dəyərlər. */
export type SearchLang = "zh" | "es" | "en";

const TARGET: Record<
  SearchLang,
  { name: string; marketplaces: string; validate: (t: string) => boolean }
> = {
  zh: {
    name: "Simplified Chinese",
    marketplaces: "Chinese marketplaces (1688, Taobao)",
    // Çincə cavabda heroqlif olmalıdır — model izahat qaytarıbsa atılır.
    validate: (t) => /[一-鿿]/.test(t),
  },
  es: {
    name: "Spanish",
    marketplaces: "the Spanish Zara catalogue",
    // Latın əlifbası üçün heroqlif yoxlaması mənasızdır: cavab qısa olmalı
    // və izahat/cümlə kimi görünməməlidir.
    validate: (t) => t.length > 0 && t.length <= 60 && !/[.:;!?]/.test(t),
  },
  en: {
    name: "English",
    marketplaces: "an international catalogue",
    validate: (t) => t.length > 0 && t.length <= 60 && !/[.:;!?]/.test(t),
  },
};

const LANG_NAME: Record<Lang, string> = {
  az: "Azerbaijani",
  ru: "Russian",
  en: "English",
};

export type TranslateResult = {
  /** Axtarışda istifadə olunacaq açar söz (tərcümə alınmasa orijinal). */
  keyword: string;
  /** true — hədəf dilə tərcümə olundu; false — platforma özü tərcümə etməlidir. */
  translated: boolean;
};

/**
 * Proses ömrü boyu sadə keş.
 * Açar HƏDƏF DİLİNİ də daxil edir — əks halda "köynək"in çincə tərcüməsi
 * ispanca sorğuya da qaytarılardı.
 */
const cache = new Map<string, string>();

let gemini: GoogleGenAI | null = null;
let openai: OpenAI | null = null;

function systemPrompt(target: SearchLang): string {
  const t = TARGET[target];
  return (
    `You translate e-commerce product search queries into ${t.name} ` +
    `for searching ${t.marketplaces}. ` +
    `Reply with ONLY the ${t.name} search term — no explanation, no quotes, ` +
    `no punctuation, no alternatives, no transliteration.`
  );
}

function userPrompt(q: string, lang: Lang, target: SearchLang): string {
  return `Translate this ${LANG_NAME[lang]} product search query to ${TARGET[target].name}: ${q}`;
}

async function viaGemini(
  q: string,
  lang: Lang,
  target: SearchLang,
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  gemini ??= new GoogleGenAI({ apiKey: key });

  const res = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: userPrompt(q, lang, target),
    config: {
      systemInstruction: systemPrompt(target),
      temperature: 0,
      // gemini-2.5-flash-də "düşünmə" tokenləri ÇIXIŞ büdcəsindən yeyilir:
      // 64 limit ilə "camisa" → "cam" kimi kəsilirdi. Düşünmə söndürülür və
      // limit qaldırılır — bir sözlük tərcümə üçün düşünməyə ehtiyac yoxdur.
      thinkingConfig: { thinkingBudget: 0 },
      maxOutputTokens: 256,
    },
  });
  return res.text?.trim() ?? null;
}

async function viaOpenAI(
  q: string,
  lang: Lang,
  target: SearchLang,
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  openai ??= new OpenAI();

  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    temperature: 0,
    max_tokens: 64,
    messages: [
      { role: "system", content: systemPrompt(target) },
      { role: "user", content: userPrompt(q, lang, target) },
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? null;
}

/**
 * Sorğunu platformanın axtarış dilinə çevirir.
 *
 * QEYD: "onsuz da hədəf dildədir" qısayolu yalnız ÇİNCƏ üçün tətbiq olunur —
 * orada heroqlif aydın siqnaldır. İspanca/ingiliscə üçün belə yoxlama yoxdur,
 * çünki azərbaycanca söz də latın əlifbasındadır və səhvən "artıq ispancadır"
 * sayılıb tərcüməsiz ötürülərdi.
 */
/**
 * Sorğu məhsul KODUdurmu?
 *
 * Şərt: yalnız rəqəm və ayırıcı (`/`, `-`, boşluq) olsun və ən azı 5 rəqəm
 * saysın. 5 həddi qəsdəndir — "2025" kimi il və ya "40" kimi ölçü sorğusu
 * kod sayılıb tərcüməsiz qalmasın.
 */
function looksLikeProductCode(q: string): boolean {
  if (!/^[\d\s/-]+$/.test(q)) return false;
  return (q.match(/\d/g) ?? []).length >= 5;
}

export async function translateQuery(
  query: string,
  lang: Lang,
  target: SearchLang,
): Promise<TranslateResult> {
  const q = query.trim();
  if (!q) return { keyword: q, translated: false };

  // MƏHSUL KODU TƏRCÜMƏ OLUNMUR.
  //
  // Müştəri Zara-nın artikulunu (`05070904`, `5070/904`) və ya 1688 item
  // id-sini yazanda bunun dili yoxdur — tərcümə etmək sorğunu korlayır
  // (model rəqəmə söz uydurur və ya izahat qaytarır). Zara-nın axtarışı
  // kodu OLDUĞU KİMİ qəbul edir — yoxlandı: `05070904`, `5070/904` və
  // `5070904` eyni məhsulu tapır.
  if (looksLikeProductCode(q)) return { keyword: q, translated: false };

  const spec = TARGET[target] ?? TARGET.zh;

  if (target === "zh" && spec.validate(q)) {
    return { keyword: q, translated: true };
  }

  const cacheKey = `${target}:${lang}:${q.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached) return { keyword: cached, translated: true };

  try {
    const text =
      PROVIDER === "openai"
        ? await viaOpenAI(q, lang, target)
        : await viaGemini(q, lang, target);

    if (text) {
      const keyword = text.split("\n")[0].trim().replace(/^["']|["']$/g, "");
      if (spec.validate(keyword)) {
        cache.set(cacheKey, keyword);
        return { keyword, translated: true };
      }
    }
  } catch {
    // Tərcümə uğursuzdursa axtarış dayanmasın — orijinal söz gedir.
  }

  return { keyword: q, translated: false };
}

/** Geriyə uyğunluq — çincə hədəf üçün qısayol (köhnə çağıranlar üçün). */
export async function translateToChinese(
  query: string,
  lang: Lang,
): Promise<TranslateResult> {
  return translateQuery(query, lang, "zh");
}
