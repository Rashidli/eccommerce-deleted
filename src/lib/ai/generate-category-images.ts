import "server-only";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { removeWhiteBackground } from "@/lib/images/remove-white-bg";
import { writeCategoryImage } from "@/lib/images/category-image";

// Kateqoriyalar üçün realistik şəkilləri Gemini ilə generasiya edir,
// webp-ə sıxır (512px, ~10-25KB) və `public/categories/` altına yazır.
// Yol DB-də `PlatformCategory.image` sahəsində saxlanır (qayda #4 — hardcoded yox).

const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const CONCURRENCY = 3;

/**
 * Kataloq üslubu: TƏK məhsul, təmiz AĞ fonda, studio çəkilişi —
 * mövcud `/assets/cat-*.png` şəkilləri ilə eyni görünüş.
 */
function buildPrompt(nameEn: string, nameZh: string | null): string {
  const subject = nameZh ? `${nameEn} (${nameZh})` : nameEn;
  return (
    `Professional e-commerce product photograph of ONE single representative ` +
    `product for the shopping category "${subject}". The product is centered ` +
    `and isolated on a pure plain white background, soft even studio lighting, ` +
    `subtle natural shadow beneath it, sharp focus, high detail, realistic. ` +
    `Only one object, nothing else in frame. No people, no text, no words, ` +
    `no logos, no watermarks, no props, no collage. Square framing.`
  );
}

export type ImageGenResult = {
  ok: boolean;
  generated: number;
  failed: number;
  message?: string;
};

export async function generateCategoryImages(opts?: {
  platformKey?: string;
  /** true — şəkli olanları da yenidən generasiya et. */
  force?: boolean;
  /** Maksimum neçə kateqoriya (uzun sürməsin deyə). */
  limit?: number;
}): Promise<ImageGenResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, generated: 0, failed: 0, message: "GEMINI_API_KEY yoxdur" };

  const platformKey = opts?.platformKey ?? "1688";
  const rows = await prisma.platformCategory.findMany({
    where: {
      platformKey,
      parentExternalId: "0",
      ...(opts?.force ? {} : { image: null }),
    },
    select: { externalId: true, nameEn: true, nameZh: true, nameAz: true },
    orderBy: { externalId: "asc" },
    take: opts?.limit ?? 100,
  });
  if (rows.length === 0) return { ok: true, generated: 0, failed: 0 };

  const ai = new GoogleGenAI({ apiKey: key });

  let generated = 0;
  let failed = 0;

  async function one(row: (typeof rows)[number]) {
    const label = row.nameEn || row.nameAz || row.externalId;
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: buildPrompt(label, row.nameZh),
      });
      const part = (res.candidates?.[0]?.content?.parts ?? []).find(
        (p) => p.inlineData?.data,
      );
      if (!part?.inlineData?.data) {
        failed++;
        return;
      }

      const raw = Buffer.from(part.inlineData.data, "base64");
      const webp = await removeWhiteBackground(raw);

      // Böyük fayl + 128px miniatür (bax: `lib/images/category-image.ts`).
      const publicPath = await writeCategoryImage(
        `${platformKey}-${row.externalId}`,
        webp,
      );

      await prisma.platformCategory.updateMany({
        where: { platformKey, externalId: row.externalId },
        data: { image: publicPath },
      });
      generated++;
    } catch {
      failed++;
    }
  }

  // Sadə paralel işçi hovuzu — API-ni boğmadan sürətləndirir.
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (;;) {
        const row = queue.shift();
        if (!row) return;
        await one(row);
      }
    }),
  );

  return { ok: true, generated, failed };
}
