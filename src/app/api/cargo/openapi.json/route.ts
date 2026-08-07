import { NextResponse } from "next/server";
import { buildCargoOpenApi } from "@/lib/cargo/openapi";

// Kargo inteqrasiyasının OpenAPI müqaviləsi — AÇIQ endpoint-dir.
// Kargo şirkətinə sadəcə bu linki göndərmək kifayətdir; heç bir sirr saxlamır
// (tokenlər və açarlar burada YOXDUR, yalnız formatı təsvir olunur).
export async function GET() {
  return NextResponse.json(buildCargoOpenApi(), {
    headers: {
      // Sənəd nadir dəyişir — kənar tərəf keşləyə bilsin.
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
