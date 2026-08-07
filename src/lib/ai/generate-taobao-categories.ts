import "server-only";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

// TAOBAO KATEQORİYA AĞACI
//
// Partzona-da Taobao üçün kateqoriya endpoint-i YOXDUR (`/taobao/categories` → 404)
// və məhsul cavablarında da kateqoriya sahəsi gəlmir. Ona görə ağac Gemini ilə
// qurulur və bazaya yazılır — 1688-in ağacından KOPYALANMIR, çünki 1688 topdan
// satış (B2B) ağacıdır (冶金矿产, 化工, 项目合作 …), Taobao isə pərakəndə (B2C).
//
// Ən vacib sahə `nameZh`-dir: Taobao-da kateqoriya baxışı məhz çincə adla
// axtarışa çevrilir (`poolType` null olduğu üçün servis o yola düşür).

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const PLATFORM = "taobao";
/** ID prefiksi — 1688-in rəqəmli ID-ləri ilə heç vaxt qarışmasın. */
const ID_PREFIX = "tb-";
/** Alt kateqoriya sorğuları bir neçə valideyn üçün paralel gedir. */
const CONCURRENCY = 3;

const TOP_PROMPT = `You are building the category tree of Taobao (淘宝), China's
largest CONSUMER (B2C) marketplace. Return its main top-level shopping categories
as a real shopper would see them — NOT wholesale/industrial B2B categories.

Return 24 top-level categories. For each one:
- "slug": short lowercase pinyin, a-z and dashes only, no spaces (e.g. "nvzhuang")
- "zh": the authentic Chinese Taobao category name (e.g. "女装")
- "az": Azerbaijani label, MAX 2 words, ideally 1
- "en": English label, MAX 2 words, ideally 1
- "ru": Russian label, MAX 2 words, ideally 1

Labels must be short enough to fit a small category tile. Use natural shopping
wording, not literal translation.

Return ONLY a JSON array, no markdown fence:
[{"slug":"...","zh":"...","az":"...","en":"...","ru":"..."}]`;

const SUB_PROMPT = `You are building the Taobao (淘宝) category tree.
You receive one PARENT consumer category. Return its real subcategories as they
appear on Taobao — between 10 and 16 of them.

For each subcategory:
- "slug": short lowercase pinyin, a-z and dashes only (unique within the parent)
- "zh": the authentic Chinese Taobao subcategory name
- "az": Azerbaijani label, MAX 2 words, ideally 1
- "en": English label, MAX 2 words, ideally 1
- "ru": Russian label, MAX 2 words, ideally 1

Return ONLY a JSON array, no markdown fence:
[{"slug":"...","zh":"...","az":"...","en":"...","ru":"..."}]`;

type Node = { slug: string; zh: string; az: string; en: string; ru: string };

export type TaobaoTreeResult = {
  ok: boolean;
  topLevel: number;
  subs: number;
  removedCopies: number;
  message?: string;
};

/** Model bəzən ```json ... ``` içində qaytarır — təmizləyib parse edirik. */
function parseNodes(raw: string): Node[] {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is Node =>
        Boolean(n) &&
        typeof n.slug === "string" &&
        typeof n.zh === "string" &&
        n.slug.trim() !== "" &&
        n.zh.trim() !== "",
    );
  } catch {
    return [];
  }
}

/** Slug-ı təhlükəsiz hala salır: yalnız a-z, rəqəm və tire. */
function safeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/**
 * Taobao-nun ÖZ kateqoriya ağacını qurur və bazaya yazır.
 * İdempotentdir: `(platformKey, externalId)` üzrə upsert edir, təkrar işlətmək olar.
 */
export async function generateTaobaoCategories(opts?: {
  /** true — 1688-dən kopyalanmış köhnə sətirləri silmə (sınaq üçün). */
  keepCopies?: boolean;
}): Promise<TaobaoTreeResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return {
      ok: false,
      topLevel: 0,
      subs: 0,
      removedCopies: 0,
      message: "GEMINI_API_KEY yoxdur",
    };
  }

  const ai = new GoogleGenAI({ apiKey: key });

  // 1) Yuxarı səviyyə
  const topRes = await ai.models.generateContent({
    model: MODEL,
    contents: "Generate the Taobao top-level consumer categories.",
    config: {
      systemInstruction: TOP_PROMPT,
      temperature: 0,
      responseMimeType: "application/json",
      maxOutputTokens: 8192,
    },
  });

  const tops = parseNodes(topRes.text ?? "[]");
  if (tops.length === 0) {
    return {
      ok: false,
      topLevel: 0,
      subs: 0,
      removedCopies: 0,
      message: "Gemini yuxarı səviyyə kateqoriya qaytarmadı",
    };
  }

  // Slug təkrarlanmasın (Gemini eyni slug-ı iki dəfə verə bilər).
  const seenTop = new Set<string>();
  const topNodes = tops.filter((n) => {
    const s = safeSlug(n.slug);
    if (!s || seenTop.has(s)) return false;
    seenTop.add(s);
    return true;
  });

  let topLevel = 0;
  let subs = 0;

  for (const node of topNodes) {
    const externalId = `${ID_PREFIX}${safeSlug(node.slug)}`;
    await prisma.platformCategory.upsert({
      where: { platformKey_externalId: { platformKey: PLATFORM, externalId } },
      create: {
        platformKey: PLATFORM,
        externalId,
        parentExternalId: "0",
        nameZh: node.zh.trim(),
        nameAz: node.az?.trim() || node.en?.trim() || node.zh.trim(),
        nameEn: node.en?.trim() || node.zh.trim(),
        nameRu: node.ru?.trim() || node.en?.trim() || node.zh.trim(),
        // `poolType` null → kateqoriya baxışı çincə ad ilə axtarışa düşür.
        poolType: null,
        // Öz ağacıdır, kopya deyil.
        derivedFrom: null,
        isLeaf: false,
        sortOrder: topLevel,
      },
      update: {
        parentExternalId: "0",
        nameZh: node.zh.trim(),
        nameAz: node.az?.trim() || node.en?.trim() || node.zh.trim(),
        nameEn: node.en?.trim() || node.zh.trim(),
        nameRu: node.ru?.trim() || node.en?.trim() || node.zh.trim(),
        poolType: null,
        derivedFrom: null,
        isLeaf: false,
        sortOrder: topLevel,
      },
    });
    topLevel++;
  }

  // 2) Alt kateqoriyalar — valideyn başına bir sorğu, sadə paralel hovuz.
  const queue = [...topNodes];

  async function worker() {
    for (;;) {
      const parent = queue.shift();
      if (!parent) return;

      const parentId = `${ID_PREFIX}${safeSlug(parent.slug)}`;
      try {
        const res = await ai.models.generateContent({
          model: MODEL,
          contents: JSON.stringify({ zh: parent.zh, en: parent.en }),
          config: {
            systemInstruction: SUB_PROMPT,
            temperature: 0,
            responseMimeType: "application/json",
            maxOutputTokens: 8192,
          },
        });

        const children = parseNodes(res.text ?? "[]");
        const seen = new Set<string>();
        let order = 0;

        for (const child of children) {
          const slug = safeSlug(child.slug);
          if (!slug || seen.has(slug)) continue;
          seen.add(slug);

          const externalId = `${parentId}-${slug}`;
          await prisma.platformCategory.upsert({
            where: {
              platformKey_externalId: { platformKey: PLATFORM, externalId },
            },
            create: {
              platformKey: PLATFORM,
              externalId,
              parentExternalId: parentId,
              nameZh: child.zh.trim(),
              nameAz: child.az?.trim() || child.en?.trim() || child.zh.trim(),
              nameEn: child.en?.trim() || child.zh.trim(),
              nameRu: child.ru?.trim() || child.en?.trim() || child.zh.trim(),
              poolType: null,
              derivedFrom: null,
              isLeaf: true,
              sortOrder: order,
            },
            update: {
              parentExternalId: parentId,
              nameZh: child.zh.trim(),
              nameAz: child.az?.trim() || child.en?.trim() || child.zh.trim(),
              nameEn: child.en?.trim() || child.zh.trim(),
              nameRu: child.ru?.trim() || child.en?.trim() || child.zh.trim(),
              poolType: null,
              derivedFrom: null,
              isLeaf: true,
              sortOrder: order,
            },
          });
          order++;
          subs++;
        }
      } catch {
        // Bir valideyn alınmasa qalanları davam etsin.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, topNodes.length) }, worker),
  );

  // 3) 1688-dən kopyalanmış köhnə sətirləri sil + sahibsiz əlaqələri təmizlə.
  let removedCopies = 0;
  if (!opts?.keepCopies) {
    const copies = await prisma.platformCategory.findMany({
      where: { platformKey: PLATFORM, derivedFrom: "1688" },
      select: { externalId: true },
    });
    const copyIds = copies.map((c) => c.externalId);

    if (copyIds.length > 0) {
      // Əvvəlcə həmin kateqoriyalara bağlı baxış nəticələri silinir,
      // əks halda `CategoryProduct`-da sahibsiz sətirlər qalardı.
      await prisma.categoryProduct.deleteMany({
        where: { platformKey: PLATFORM, categoryId: { in: copyIds } },
      });
      const del = await prisma.platformCategory.deleteMany({
        where: { platformKey: PLATFORM, derivedFrom: "1688" },
      });
      removedCopies = del.count;
    }
  }

  return { ok: true, topLevel, subs, removedCopies };
}

/**
 * Nav/ana səhifə görünmə bayraqlarını qoyur (admin sonra bazadan dəyişir).
 * Seçim çincə ada görə edilir — slug Gemini-dən asılıdır, `nameZh` isə sabitdir.
 */
export async function setTaobaoVisibility(): Promise<{
  nav: number;
  home: number;
}> {
  // Alıcının ilk gözlədiyi kateqoriyalar. Açar sözlər ağacın REAL adlarına
  // görə seçilib (Taobao-da "女鞋/男鞋" ayrı deyil — "鞋靴" birdir).
  const NAV_ZH = ["女装", "男装", "鞋靴", "箱包", "美妆", "手机", "母婴", "家居"];
  const HOME_ZH = [
    ...NAV_ZH,
    "数码",
    "家电",
    "食品",
    "运动",
    "玩具",
    "珠宝",
    "童装",
    "内衣",
    "手表",
    "厨具",
  ];

  await prisma.platformCategory.updateMany({
    where: { platformKey: PLATFORM },
    data: { showInNav: false, showOnHome: false },
  });

  // `nameZh` tam uyğun gəlməyə bilər (məs. "手机数码"), ona görə `contains`.
  // Eyni sətir iki açar sözlə tapılsa təkrar sayılmasın deyə `id` yığılır.
  const flag = async (list: string[], field: "showInNav" | "showOnHome") => {
    const hit = new Set<string>();
    for (const zh of list) {
      const row = await prisma.platformCategory.findFirst({
        where: {
          platformKey: PLATFORM,
          parentExternalId: "0",
          nameZh: { contains: zh },
          id: { notIn: [...hit] },
        },
        orderBy: { sortOrder: "asc" },
      });
      if (!row) continue;
      hit.add(row.id);
      await prisma.platformCategory.update({
        where: { id: row.id },
        data: { [field]: true },
      });
    }
    return hit.size;
  };

  const nav = await flag(NAV_ZH, "showInNav");
  const home = await flag(HOME_ZH, "showOnHome");
  return { nav, home };
}
