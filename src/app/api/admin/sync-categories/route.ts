import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";
import { syncPartzonaCategories } from "@/lib/partzona/sync-categories";

// Partzona 1688 kateqoriya ağacını DB-yə sinxronlaşdırır.
// Yalnız admin sessiyası ilə (proxy /api-ni tutmur, ona görə burada yoxlanılır).
export async function POST() {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await syncPartzonaCategories();
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
