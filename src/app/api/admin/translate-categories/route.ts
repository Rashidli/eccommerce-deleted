import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { translatePlatformCategories } from "@/lib/ai/translate-categories";

// Platforma kateqoriya adlarını Gemini ilə az/en/ru-ya çevirir və qısaldır.
// Yalnız admin sessiyası ilə (proxy /api-ni tutmur).
export async function POST(request: Request) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "1";

  const result = await translatePlatformCategories({
    platformKey: url.searchParams.get("platform") ?? "1688",
    onlyTopLevel: !all,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}

// Uzun sürə bilər (paketlərlə Gemini sorğuları).
export const maxDuration = 300;
