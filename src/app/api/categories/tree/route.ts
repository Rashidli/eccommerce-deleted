import { NextResponse } from "next/server";
import { getLang } from "@/lib/server-lang";
import { getCategoryTree } from "@/lib/data/catalog";

/**
 * KATALOQ AĞACI — header-dəki mega-menyu bunu İLK AÇILANDA çəkir.
 *
 * Niyə hər səhifə ilə birlikdə göndərilmir: ağac 837 kateqoriyadır (~150 KB
 * JSON). Onu hər səhifənin HTML-inə qoymaq bütün saytı ağırlaşdırardı, halbuki
 * istifadəçilərin çoxu menyunu heç açmır. Menyu bir dəfə çəkib öz state-ində
 * saxlayır — ikinci açılışda sorğu getmir.
 *
 * Dil cookie-dən gəldiyi üçün cavab istifadəçiyə görə dəyişir → `no-store`.
 * (Ağacın özü nadir dəyişir, amma dil üç variantlıdır; keşləmək lazım gələrsə
 * dil ünvana çıxarılmalıdır.)
 */
export async function GET() {
  const lang = await getLang();
  const categories = await getCategoryTree(lang);

  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "no-store" } },
  );
}
