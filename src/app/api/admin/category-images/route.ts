import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { generateCategoryImages } from "@/lib/ai/generate-category-images";

// Kateqoriyalar üçün realistik şəkilləri Gemini ilə generasiya edir.
// Yalnız admin sessiyası ilə. Uzun sürür — `limit` ilə hissə-hissə çağırmaq olar.
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit"));

  const result = await generateCategoryImages({
    platformKey: url.searchParams.get("platform") ?? "1688",
    force: url.searchParams.get("force") === "1",
    limit: Number.isFinite(limitParam) && limitParam > 0 ? limitParam : undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

export const maxDuration = 800;
