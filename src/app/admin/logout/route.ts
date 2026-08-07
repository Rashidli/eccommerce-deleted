import { NextResponse, type NextRequest } from "next/server";
import { absoluteUrl } from "@/lib/site-url";
import { endSession, getSessionId } from "@/lib/auth";
import { destroyAdminSession } from "@/lib/admin-auth";

export async function POST(_request: NextRequest) {
  // Cookie-ni silmək KİFAYƏT DEYİL: token imzalıdır və nüsxəsi götürülübsə
  // vaxtı bitənə qədər işləməyə davam edərdi. Sessiya sətri də silinir.
  const sessionId = await getSessionId();
  if (sessionId) await destroyAdminSession(sessionId);

  await endSession();
  // PUBLIC URL — `request.url` nginx arxasında daxili ünvanı verir.
  return NextResponse.redirect(absoluteUrl("/admin/login"), 303);
}
