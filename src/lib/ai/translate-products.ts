import "server-only";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

// Məhsul adları platformadan İNGİLİSCƏ (1688/taobao `translated_name`, Zara `name`)
// və ya çincə gəlir. Storefront pickLang(nameAz/En/Ru) işlətdiyi üçün az/ru
// boş qalırsa istifadəçi ingiliscə/çincə ad görür (qayda #5 pozuntusu).
// Bu modul məhsul adlarını Gemini ilə az/ru-ya çevirir (en olduğu kimi qalır).

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
// Məhsul adları kateqoriyalardan uzundur — kiçik paket saxlayırıq ki, cavab
// token limitini keçib JSON-u kəsməsin (kateqoriyalarda bu tələ yaşandı).
const BATCH = 12;

const PROMPT = `You localize e-commerce PRODUCT titles for a shopping site.
For each item (id, original title in Chinese or English) produce a natural,
concise product title in Azerbaijani and Russian. Keep it shopping-friendly and
readable — translate meaning, not word-for-word; drop marketing filler and
repeated keywords. Keep brand/model tokens (e.g. "iPhone 15", "Nike") as-is.
Target length similar to a normal product name, not a keyword dump.

Some items also carry a "desc" (product description, may be Spanish, Chinese or
English). When "desc" is present, translate it too: keep the factual details
(material, fit, care, measurements), drop marketing fluff, 1-3 sentences.
When "desc" is absent, omit descAz/descRu from that item's output.

Return ONLY a JSON array, no markdown fence, in this exact shape:
[{"id":"<id>","az":"<Azerbaijani title>","ru":"<Russian title>","descAz":"<optional>","descRu":"<optional>"}]`;

type Item = { id: string; title: string; desc?: string };
type Translated = {
  id: string;
  az: string;
  ru: string;
  descAz?: string;
  descRu?: string;
};

function parseJsonArray(raw: string): Translated[] {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? (parsed as Translated[]) : [];
  } catch {
    return [];
  }
}

/**
 * İmport-dan sonra yeni məhsulların adlarını FONDA tərcümə edir (bloklamır).
 * PM2 uzun-ömürlü proses olduğu üçün fire-and-forget təhlükəsizdir — sorğu
 * cavabını gözlətmir, tərcümə arxada tamamlanır. Xəta udulur (import sınmasın).
 */
export function translateProductsInBackground(ids: string[]): void {
  if (ids.length === 0 || !process.env.GEMINI_API_KEY) return;
  translateProductNames({ ids, limit: ids.length }).catch(() => {
    // Tərcümə fon işidir — alınmasa toplu skript sonra tamamlayır.
  });
}

export async function translateProductNames(opts?: {
  /** Yalnız bu platformanın məhsulları (source). Verilməsə hamısı. */
  source?: string;
  /** Yalnız bu ID-lər (import-dan sonra yeni məhsulları tərcümə etmək üçün). */
  ids?: string[];
  /** Bir çağırışda maksimum neçə məhsul (uzun sürməsin). */
  limit?: number;
  /** true — artıq tərcümə olunanları da yenidən çevir. */
  force?: boolean;
}): Promise<{ ok: boolean; updated: number; message?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, updated: 0, message: "GEMINI_API_KEY yoxdur" };

  const rows = await prisma.product.findMany({
    where: {
      ...(opts?.ids
        ? { id: { in: opts.ids } }
        : opts?.source
          ? { source: opts.source }
          : { source: { not: null } }),
      // Tərcüməsiz = nameAz boş VƏ YA ingiliscə/orijinal ilə eyni.
      // Tərcüməsiz = adı YOXDUR, ya da təsviri var amma azərbaycancası yoxdur.
      ...(opts?.force
        ? {}
        : {
            OR: [
              { nameAz: null },
              { nameAz: "" },
              {
                AND: [
                  { description: { not: null } },
                  { description: { not: "" } },
                  { OR: [{ descAz: null }, { descAz: "" }] },
                ],
              },
            ],
          }),
    },
    select: {
      id: true,
      name: true,
      nameEn: true,
      description: true,
      descAz: true,
    },
    orderBy: { createdAt: "desc" },
    take: opts?.limit ?? 500,
  });
  if (rows.length === 0) return { ok: true, updated: 0 };

  const ai = new GoogleGenAI({ apiKey: key });
  let updated = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const items: Item[] = slice.map((r) => ({
      id: r.id,
      title: r.nameEn || r.name,
      // Uzun təsvirlər cavabı token limitinə dirəyir — 600 simvol kifayətdir.
      ...(r.description && !r.descAz
        ? { desc: r.description.slice(0, 600) }
        : {}),
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
      const byId = new Map(list.map((t) => [String(t.id), t]));

      await Promise.all(
        slice.map(async (r) => {
          const t = byId.get(r.id);
          if (!t) return;
          if (!t.az && !t.descAz) return;
          await prisma.product.update({
            where: { id: r.id },
            data: {
              ...(t.az ? { nameAz: t.az, nameRu: t.ru || t.az } : {}),
              // İngiliscə adı olmayan (çincə qalan) məhsul üçün en də doldurulur.
              ...(r.nameEn ? {} : { nameEn: r.name }),
              // Təsvir yalnız model qaytarıbsa yazılır (mövcudu silmirik).
              ...(t.descAz ? { descAz: t.descAz } : {}),
              ...(t.descRu ? { descRu: t.descRu } : {}),
              ...(r.description && !r.descAz && t.descAz
                ? { descEn: r.description }
                : {}),
            },
          });
          updated++;
        }),
      );
    } catch {
      // Bir paket alınmasa növbətiyə keçirik — idempotentdir, təkrar cəhddə tamamlanır.
    }
  }

  return { ok: true, updated };
}
