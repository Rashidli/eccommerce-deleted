import "server-only";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

// Partzona `lang=az/ru` üçün də İNGİLİSCƏ `translated_name` qaytarır (yalnız çincə fərqlidir).
// Ona görə kateqoriya adlarını özümüz Gemini ilə 3 dilə çeviririk — həm də QISA
// (UI-da kateqoriya kartları dar olduğu üçün uzun adlar kəsilir).

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// 25 uzun ifadə cavabı token limitinə dirəyib JSON-u kəsirdi → bütün paket
// atlanırdı. Kiçik paket + böyük limit ilə qalıq kateqoriyalar da tərcümə olunur.
const BATCH = 10;

const PROMPT = `You localize e-commerce category names for a shopping site.
For each item you receive (id, Chinese name, English name), produce SHORT category
labels — maximum 2 words each, ideally 1 word. They must fit on a small category tile.
Use natural, common shopping-category wording, not literal translation.

Return ONLY a JSON array, no markdown fence, in this exact shape:
[{"id":"<id>","az":"<Azerbaijani>","en":"<English>","ru":"<Russian>"}]`;

type Item = { id: string; zh: string | null; en: string | null };
type Translated = { id: string; az: string; en: string; ru: string };

function parseJsonArray(raw: string): Translated[] {
  // Model bəzən ```json ... ``` içində qaytarır — təmizləyirik.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? (parsed as Translated[]) : [];
}

/**
 * PlatformCategory adlarını Gemini ilə az/en/ru dillərinə çevirir və QISALDIR.
 * `onlyTopLevel` — yalnız yuxarı səviyyə (parent="0"), UI-da göstərilənlər.
 */
export async function translatePlatformCategories(opts?: {
  platformKey?: string;
  onlyTopLevel?: boolean;
  /** true — artıq tərcümə olunanları da yenidən çevir. */
  force?: boolean;
}): Promise<{ ok: boolean; updated: number; message?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, updated: 0, message: "GEMINI_API_KEY yoxdur" };

  const all = await prisma.platformCategory.findMany({
    where: {
      platformKey: opts?.platformKey ?? "1688",
      ...(opts?.onlyTopLevel === false ? {} : { parentExternalId: "0" }),
    },
    select: { externalId: true, nameZh: true, nameEn: true, nameAz: true },
    orderBy: { externalId: "asc" },
  });

  // Artıq tərcümə olunanları ötürürük: tərcüməsiz sətirdə `nameAz` boşdur və ya
  // ingiliscə ilə eynidir. Beləliklə təkrar işlətmək ucuzdur və yarımçıq
  // qalmış (Gemini xətası olan) paketləri tamamlamağa imkan verir.
  const rows = opts?.force
    ? all
    : all.filter((r) => !r.nameAz || r.nameAz === r.nameEn);

  if (rows.length === 0) return { ok: true, updated: 0 };

  const ai = new GoogleGenAI({ apiKey: key });
  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const items: Item[] = slice.map((r) => ({
      id: r.externalId,
      zh: r.nameZh,
      en: r.nameEn,
    }));

    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: JSON.stringify(items),
        config: {
          systemInstruction: PROMPT,
          temperature: 0,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      });

      const list = parseJsonArray(res.text ?? "[]");
      for (const t of list) {
        if (!t?.id || !t.az) continue;
        await prisma.platformCategory.updateMany({
          where: {
            platformKey: opts?.platformKey ?? "1688",
            externalId: String(t.id),
          },
          data: {
            nameAz: t.az.trim(),
            nameEn: (t.en ?? "").trim() || undefined,
            nameRu: (t.ru ?? "").trim() || undefined,
          },
        });
        updated++;
      }
    } catch {
      // Bir paket alınmasa qalanları davam etsin.
    }
  }

  return { ok: true, updated };
}
