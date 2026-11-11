import "server-only";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { restoreAzDiacritics } from "@/lib/ai/az-diacritics";
import { resolveFromDictionary, joinParts } from "@/lib/ai/query-resolve";
import { rememberTerm } from "@/lib/ai/query-terms";
import { TARGET, type SearchLang } from "@/lib/ai/translate-target";
import type { Lang } from "@/lib/i18n";

export type { SearchLang } from "@/lib/ai/translate-target";

// AI tərcümə: istifadəçinin sorğusu PLATFORMANIN danışdığı dilə çevrilir.
//   · 1688 / Taobao → çincə (zh)   · Zara → ispanca (es)
//
// Niyə vacibdir: platformalar öz dilində qat-qat çox nəticə verir.
// Canlı ölçmə — "shirt": çincə 衬衫 ilə Zara 300, ispanca "camisa" ilə 1157
// nəticə qaytardı. Yəni yanlış dil kataloqun ~75%-ni gizlədirdi.
//
// PROVAYDER ZƏNCİRİ (sıra ilə sınanır, ilk uğurlu cavab qəbul edilir):
//   1. `AI_PROVIDER` ilə seçilən model — "gemini" (default) | "openai"
//   2. Google-un açar tələb etməyən tərcümə endpoint-i (ehtiyat)
//
// NİYƏ ZƏNCİR: bu serverdə Gemini işləmir — Google regionu bloklayır
// (`400 FAILED_PRECONDITION: User location is not supported`). Ölçüldü:
// hər axtarışda 150-800 ms itirilirdi VƏ sorğu 1688-ə azərbaycanca gedirdi.
//
// Nəticə ölçüldü ("qadın köynəyi", 1688):
//     azərbaycanca göndərildikdə  →     5 nəticə, tamamilə əlaqəsiz
//     çincə 女式衬衫 göndərildikdə →  2000 nəticə, hamısı yerində
// Yəni tərcümə "gözəllik" deyil, axtarışın işləməsinin şərtidir.
//
// Hər şey YALNIZ serverdə (qayda #2).

const PROVIDER = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

/**
 * Ehtiyat tərcüməçi üçün vaxt həddi. Tərcümə axtarışın qarşısındadır — yavaş
 * cavab bütün səhifəni gözlədir. Ölçülmüş diapazon 35-1700 ms olduğu üçün
 * 4 saniyə geniş, amma sonsuz deyil.
 */
const FREE_TIMEOUT_MS = 4000;

/**
 * DÖVRƏ KƏSİCİSİ — dalbadal uğursuz olan provayder müvəqqəti buraxılır.
 *
 * Səbəb: region blokunda Gemini HƏR sorğuda 150-800 ms yeyib eyni xətanı
 * qaytarırdı. Bloklanma davam etdiyi müddətdə ona müraciət etmək saf itkidir.
 * Soyuma müddətindən sonra bir dəfə yenidən sınanır — blok götürülərsə (və ya
 * açar əlavə edilərsə) sistem özü bərpa olur, deploy lazım gəlmir.
 */
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 10 * 60_000;

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
  /**
   * 0 NƏTİCƏ gələndə sınanacaq DAHA GENİŞ açar söz — lüğətdən gələn hissə,
   * naməlum sözlər (adətən brend) atılmış halda. Yoxdursa genişləndirmə
   * mümkün deyil, çağıran sadəcə boş nəticə qaytarır.
   */
  broader?: string;
};

/**
 * Proses ömrü boyu sadə keş.
 * Açar HƏDƏF DİLİNİ də daxil edir — əks halda "köynək"in çincə tərcüməsi
 * ispanca sorğuya da qaytarılardı.
 */
const cache = new Map<string, string>();

let gemini: GoogleGenAI | null = null;
let openai: OpenAI | null = null;

/**
 * İki qayda ölçmə nəticəsində əlavə olundu (hər ikisi 1688-də yoxlanıb):
 *
 * 1. BREND TƏRCÜMƏ OLUNMUR. Latın hərfli brend adı olduğu kimi qalmalıdır —
 *    1688 onu özü tanıyır: `gucci 包` → 1049 nəticə, `gucci sumka` → 0.
 *
 * 2. DANIŞIQ ALINMALARI MƏNAYA GÖRƏ ÇEVRİLİR. Müştəri kataloq dilində yox,
 *    danışıq dilində yazır — əsasən rus alınmaları ilə ("sumka", "krossovka",
 *    "pasaniska", "platye"). Model bunları hərfi transliterasiya edəndə nəticə
 *    tamamilə əlaqəsiz olur (ölçüldü: "sumka" → sabun, keçə parça, saç sancağı).
 */
function systemPrompt(target: SearchLang): string {
  const t = TARGET[target];
  return (
    `You translate e-commerce product search queries into ${t.name} ` +
    `for searching ${t.marketplaces}. ` +
    `Keep brand names, model names and product codes written in Latin script ` +
    `EXACTLY as given — never translate or transliterate them. ` +
    `The query may use colloquial Russian loanwords as written by Azerbaijani ` +
    `speakers (e.g. "sumka" = bag, "krossovka" = sneakers, "pasaniska" = sandals, ` +
    `"platye" = dress); translate those by MEANING, never by sound. ` +
    `Reply with ONLY the search term — no explanation, no quotes, ` +
    `no punctuation, no alternatives.`
  );
}

function userPrompt(q: string, lang: Lang, target: SearchLang): string {
  return `Translate this ${LANG_NAME[lang]} product search query to ${TARGET[target].name}: ${q}`;
}

/**
 * PROKSİ ÜNVANI — Gemini-nin region blokunu keçmək üçün.
 *
 * Bu serverdən Google birbaşa sorğunu rədd edir:
 *     400 FAILED_PRECONDITION: User location is not supported for the API use.
 * (yoxlanılıb — açar etibarlıdır, problem AÇARDA yox, SERVERİN REGIONUNDADIR).
 *
 * `GEMINI_BASE_URL` təyin olunanda bütün sorğular həmin ünvana gedir — yəni
 * bloklanmayan regiondakı proksiyə. Təyin olunmayanda kitabxana öz standart
 * ünvanına gedir, yəni bu dəyişiklik mövcud davranışı POZMUR.
 *
 * Proksi Gemini-nin `/v1beta/...` yolunu olduğu kimi ötürməlidir (sadə reverse
 * proxy kifayətdir); açar `x-goog-api-key` başlığında gedir, proksidə saxlanmır.
 */
const GEMINI_BASE_URL = process.env.GEMINI_BASE_URL?.trim();

async function viaGemini(
  q: string,
  lang: Lang,
  target: SearchLang,
): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  gemini ??= new GoogleGenAI({
    apiKey: key,
    ...(GEMINI_BASE_URL ? { httpOptions: { baseUrl: GEMINI_BASE_URL } } : {}),
  });

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

/** Google endpoint-inin gözlədiyi dil kodları (bizimkilərdən fərqlidir). */
const GOOGLE_SOURCE: Record<Lang, string> = { az: "az", ru: "ru", en: "en" };
const GOOGLE_TARGET: Record<SearchLang, string> = {
  zh: "zh-CN",
  es: "es",
  en: "en",
};

/**
 * EHTİYAT TƏRCÜMƏÇİ — Google-un açar tələb etməyən endpoint-i.
 *
 * Bu RƏSMİ API DEYİL: SLA yoxdur, sürət limiti elan olunmayıb və Google onu
 * istənilən vaxt dəyişə bilər. Buna baxmayaraq zəncirdə saxlanılır, çünki
 * ölçmə göstərdi ki, əsas provayder bu serverdə ümumiyyətlə işləmir və
 * onsuz axtarış tamamilə yanlış nəticə verir. Uzunmüddətli düzgün həll —
 * işlək açarlı provayder (OpenAI/Anthropic) və ya proksi.
 *
 * Cavab formatı: [[["女式衬衫","qadın köynəyi",...], ...], ...]
 * Uzun mətn hissələrə bölünür, ona görə birinci sütunlar birləşdirilir.
 */
async function viaGoogleFree(
  q: string,
  lang: Lang,
  target: SearchLang,
): Promise<string | null> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx` +
    `&sl=${GOOGLE_SOURCE[lang]}&tl=${GOOGLE_TARGET[target]}&dt=t` +
    `&q=${encodeURIComponent(q)}`;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FREE_TIMEOUT_MS),
  });
  if (!res.ok) return null;

  const data: unknown = await res.json();
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;

  const text = (data[0] as unknown[])
    .map((seg) => (Array.isArray(seg) ? String(seg[0] ?? "") : ""))
    .join("")
    .trim();

  return text || null;
}

type Breaker = { failures: number; openUntil: number };
const breakers = new Map<string, Breaker>();

function breakerOpen(name: string): boolean {
  const b = breakers.get(name);
  return b !== undefined && b.openUntil > Date.now();
}

function noteFailure(name: string): void {
  const b = breakers.get(name) ?? { failures: 0, openUntil: 0 };
  b.failures++;
  if (b.failures >= BREAKER_THRESHOLD) {
    b.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    b.failures = 0;
  }
  breakers.set(name, b);
}

function noteSuccess(name: string): void {
  breakers.delete(name);
}

/** Sınanma sırası — birinci uğurlu cavab qəbul edilir. */
function providerChain(): {
  name: string;
  run: (q: string, lang: Lang, target: SearchLang) => Promise<string | null>;
}[] {
  return [
    PROVIDER === "openai"
      ? { name: "openai", run: viaOpenAI }
      : { name: "gemini", run: viaGemini },
    { name: "google-free", run: viaGoogleFree },
  ];
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

/**
 * Provayder zəncirini işə salır — ilk ETİBARLI cavabı qaytarır, olmasa `null`.
 *
 * `translateQuery`-dən ayrıldı, çünki artıq İKİ yerdən çağırılır: bütöv sorğu
 * üçün və lüğətin tuta bilmədiyi hissə üçün.
 */
async function viaChain(
  text: string,
  lang: Lang,
  target: SearchLang,
  spec: (typeof TARGET)[SearchLang],
): Promise<string | null> {
  if (!text) return null;

  const cacheKey = `${target}:${lang}:${text.toLowerCase()}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  for (const provider of providerChain()) {
    // Yaxın vaxtda dalbadal uğursuz olubsa ona müraciət etmirik.
    if (breakerOpen(provider.name)) continue;

    try {
      const raw = await provider.run(text, lang, target);
      if (!raw) {
        // Açar yoxdur / boş cavab — xəta deyil, sadəcə növbətiyə keçirik.
        noteFailure(provider.name);
        continue;
      }

      const keyword = raw.split("\n")[0].trim().replace(/^["']|["']$/g, "");
      if (spec.validate(keyword)) {
        noteSuccess(provider.name);
        cache.set(cacheKey, keyword);
        return keyword;
      }

      // Cavab gəldi, amma hədəf dilə oxşamır (model izahat qaytarıb və s.).
      noteFailure(provider.name);
    } catch {
      // Şəbəkə/API xətası — zəncir davam edir, axtarış dayanmır.
      noteFailure(provider.name);
    }
  }

  return null;
}

/**
 * Sorğunu platformanın axtarış dilinə çevirir — ÜÇ QAT, sıra ilə.
 *
 *   1. LÜĞƏT (`SearchTerm`) — danışıq sözünü birbaşa açar sözə bağlayır.
 *      Sürətlidir (şəbəkə yoxdur) və dəqiqdir: "sumka"nın 女包 olduğunu bir
 *      dəfə təsdiqləyəndən sonra hər axtarışda modeldən soruşmağın mənası yoxdur.
 *   2. AI — yalnız lüğətin tutmadığı sözlər üçün. Nəticəsi lüğətə geri yazılır,
 *      yəni lüğət istifadə olundıqca böyüyür və AI-a müraciət azalır.
 *   3. OLDUĞU KİMİ — heç biri alınmasa sorğu dəyişmədən gedir (köhnə davranış).
 *
 * `broader` sahəsi 0 nəticə halı üçündür: lüğətdən gələn açar sözlər qalır,
 * naməlum sözlər atılır. Ölçüldü — naməlum söz sorğunu ÖLDÜRÜR
 * (`qirmizi 女包` → 0), brend isə işləyir (`gucci 女包` → 300). Hansının hansı
 * olduğunu təxmin etmək əvəzinə, sıfır gələndə genişləndiririk: `女包` → 2000.
 */
export async function translateQuery(
  query: string,
  lang: Lang,
  target: SearchLang,
): Promise<TranslateResult> {
  let q = query.trim();
  if (!q) return { keyword: q, translated: false };

  // MƏHSUL KODU TƏRCÜMƏ OLUNMUR.
  //
  // Müştəri Zara-nın artikulunu (`05070904`, `5070/904`) və ya 1688 item
  // id-sini yazanda bunun dili yoxdur — tərcümə etmək sorğunu korlayır
  // (model rəqəmə söz uydurur və ya izahat qaytarır). Zara-nın axtarışı
  // kodu OLDUĞU KİMİ qəbul edir — yoxlandı: `05070904`, `5070/904` və
  // `5070904` eyni məhsulu tapır.
  if (looksLikeProductCode(q)) return { keyword: q, translated: false };

  // DİAKRİTİKA BƏRPASI — tərcümədən ƏVVƏL.
  //
  // "kisi salvari cins" kimi ASCII yazılışda tərcüməçi sözü tanımır və
  // mənasını yox, səsini çevirir (şalvar → 萨尔瓦里). Bərpa olunmuş
  // "kişi şalvarı cins" isə düzgün 男裤 牛仔裤 verir. Təfərrüat:
  // `lib/ai/az-diacritics.ts`.
  //
  // Yalnız azərbaycanca sorğuya tətbiq olunur — rus/ingilis mətnində
  // əvəzlənəcək bir şey yoxdur.
  if (lang === "az") q = await restoreAzDiacritics(q);

  const spec = TARGET[target] ?? TARGET.zh;

  if (target === "zh" && spec.validate(q)) {
    return { keyword: q, translated: true };
  }

  // ---- QAT 1: LÜĞƏT ----
  const resolved = await resolveFromDictionary(q, lang, target);

  // Hər söz lüğətdən tapıldı — AI-a ümumiyyətlə getmirik.
  if (resolved.matched && resolved.unresolved.length === 0) {
    return { keyword: joinParts(resolved.parts), translated: true };
  }

  // ---- QAT 2: AI ----
  // Lüğət heç nə tutmayıbsa bütöv sorğu gedir; qismən tutubsa YALNIZ qalan
  // sözlər gedir — beləcə model artıq həll olunmuş hissəni korlaya bilmir.
  const aiInput = resolved.matched ? resolved.unresolved.join(" ") : q;
  const aiKeyword = await viaChain(aiInput, lang, target, spec);

  /** Yalnız lüğətdən gələn hissə — həm `broader`, həm birləşdirmə üçün. */
  const dictOnly = joinParts(resolved.parts, { skipUnresolved: true });

  if (aiKeyword) {
    // Lüğət ÖZÜ BÖYÜYÜR: modelin tapdığı qarşılıq yadda saxlanır ki, eyni söz
    // bir daha şəbəkə sorğusu tələb etməsin. Cavabı gözləmirik.
    void rememberTerm({ phrase: aiInput, lang, target, keyword: aiKeyword });

    if (!resolved.matched) return { keyword: aiKeyword, translated: true };

    return {
      keyword: [dictOnly, aiKeyword].filter(Boolean).join(" "),
      translated: true,
      broader: dictOnly,
    };
  }

  // ---- QAT 3: AI ALINMADI ----
  // Lüğət qismən tutubsa nəticəni İSTİFADƏ EDİRİK — naməlum söz olduğu kimi
  // qalır (brend olsa işləyir), 0 nəticə halını isə `broader` xilas edir.
  if (resolved.matched) {
    return {
      keyword: joinParts(resolved.parts),
      translated: true,
      broader: dictOnly,
    };
  }

  // Heç nə alınmadı — orijinal söz gedir, platforma özü tərcümə etsin.
  return { keyword: q, translated: false };
}

/** Geriyə uyğunluq — çincə hədəf üçün qısayol (köhnə çağıranlar üçün). */
export async function translateToChinese(
  query: string,
  lang: Lang,
): Promise<TranslateResult> {
  return translateQuery(query, lang, "zh");
}
