import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const PLATFORM_COOKIE = "ecommerce-platform";

/**
 * SSR platforma körpüsü — client `ecommerce-platform` cookie-sini yazır, server oxuyur.
 *
 * Bu olmasa səhifə yenilənəndə başlıqda "Taobao" görünür, məhsullar isə
 * defolt platformadan gəlirdi: client seçimi yaddaşda idi, server ondan xəbərsiz.
 * Cookie hər iki tərəfin gördüyü yeganə mənbədir.
 *
 * Dəyər DB-dəki AKTİV platformalara görə yoxlanılır — söndürülmüş və ya
 * uydurma açar cookie-yə düşsə, defolta qayıdır.
 */
export async function getPlatform(): Promise<string | undefined> {
  const store = await cookies();
  const value = store.get(PLATFORM_COOKIE)?.value;
  if (!value) return undefined;
  if (value === "all") return value;

  const exists = await prisma.platform.findFirst({
    where: { key: value, isActive: true },
    select: { key: true },
  });
  return exists?.key;
}
